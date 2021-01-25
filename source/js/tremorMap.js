//** Makes a map with passed in config options */
//** Leaflet map that adds dots from a geojson */
//** Requires external UI elements */
function TremorMap(config) {
  //** Instantiate some variables */

  var map, coloringName, eventMarkers, heatmap, overlays, colorKey, topoBaseMap, baseLayers, scaleMarkers,
    rectangle, drawnRectangle, customMarker, dateStart, dateEnd,
    shapeOptions = config.boundsOptions,
    colors = config.coloringOptions.colors,
    rainbow = new Rainbow(),
    editableLayers = new L.FeatureGroup();

  // Make the map
  map = new L.Map(config.mapContainer, config.leafletOptions).setView(config.center, config.zoom);

  //Make the basemaps
  topoBaseMap = L.esri.basemapLayer("Topographic");
  baseLayers = {
    "Topographic": topoBaseMap,
    "Gray": L.esri.basemapLayer("Gray"),
    "Streets": L.esri.basemapLayer("Streets"),
    "Imagery": L.esri.basemapLayer("Imagery")
  };

  //Make a key that can be recolored
  L.Control.Color = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control color-key');
      div.innerHTML = "<div class='key-title'>Color Scale</div><div id='key-top' class='key-top'></div><div id='key-colored'></div><div id='key-bottom'></div><div class='no-data'><span> No Data: </span><div></div></div>";
      return div;
    },
    recolor: function () {
      if(colors[coloringName] && colors[coloringName].type == "magnitude") {
        $("#key-top").text("Me = 2.2");
        $("#key-bottom").text("0.5");
        $("#key-no-data").show();
      } else {
        $("#key-top").text(dateEnd);
        $("#key-bottom").text(dateStart);
        $("#key-no-data").hide();
      }
      var str = "";
      $.each(colors[coloringName].fill, function (i, color) {
        str += "," + color;
      });
      $("#key-colored").css("background-image", "linear-gradient(to top" + str + ")");
    }
  });

  //Make a key that can be recolored
  L.Control.Magnitude = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control mag-key');
      div.innerHTML = "<div id='sizes'>" +
        "<div class='key-title'>Magnitude (Me)</div>"+
        "<div class='mag-text'>0.5</div>" + 
        "<div id='circles'>" + 
        "<div></div>" +
        "<div></div>" +
        "<div></div>" +
        "<div></div>" +
        "<div></div>" +
        "</div>"+
        "<div class='mag-text'>2.2</div>" + 
        "<div class='no-data'><span> No Data: </span><div></div>";
      return div;
    }
  });

  magKey = new L.Control.Magnitude({
    position: 'topleft'
  });  

  //Create a key (added to map later)
  colorKey = new L.Control.Color({
    position: 'topleft'
  });  

  //Create empty rainbows for coloring
  rainbow = new Rainbow();

  // Custom leaflet marker
  // Allows storing of additional data in marker
  customMarker = L.CircleMarker.extend({
    options: {
      weight: config.markerOptions.weight,
      opacity: config.markerOptions.opacity,
      fillOpacity: config.markerOptions.fillOpacity,
      radius: config.markerOptions.size/2,
      magIndex: -1,
      timeIndex: 0,
      id: "",
      fill: "white", //default
      outline: "black" //default
    },
    //sets spectrum or single color using config
    setColoring: function () {
      var fill;
      if (colors[coloringName]) {
        switch (colors[coloringName].type) {
          case "magnitude":
            if (this.options.magIndex >= 0) {
              fill = "#" + rainbow.colorAt(this.options.magIndex);
            } else {
              fill = "#ababab";
            }
            break;
          
          case "time":
              fill = "#" + rainbow.colorAt(this.options.timeIndex);
            break;

          default:
            fill = colors[coloringName].fill;
        }

        this.setStyle({
          fillColor: fill,
          color: colors[coloringName].outline
        });
      }
    },
    setSizing: function(sizing) {
      var size;
      
      if ( sizing && this.options.magIndex >= 0 ){
        size = (this.options.magIndex / 100) * config.markerOptions.size + 1;
      } else if ( sizing ) {
        size = config.markerOptions.size / 2;
      }
      this.setStyle({
        radius: size ? size / 2 : config.markerOptions.size / 2
      });
        
    }
  });

  // Map overlays for leaflet overlay control
  overlays = {
    "Seismometers": L.geoJSON(seismometersGeoJSON, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: '/assets/map/station.png',
            iconSize: [10, 8]
          })
        }).bindPopup("<div>" + feature.properties.station + "</div>");
      }
    }),
    "Past Tremor": L.geoJSON(pastTremorGeoJSON, {
      style: pastTremorGeoJSON.properties.style
    }),
    "JDF Plate Contours": L.geoJSON(contoursGeoJSON, {
      style: function (feature) {
        return feature.properties.style;
      }
    })
  };

  // Add everything to the map
  map.addLayer(topoBaseMap); //background
  L.control.scale().addTo(map); //scale

  map.addLayer(editableLayers); //layers
  L.control.layers(baseLayers, overlays).addTo(map); //overlays

  //Supposed to fix recentering on chrome
  L.Control.include({
    _refocusOnMap: L.Util.falseFn // Do nothing.
  });

  //** Helper functions */

  // Allows user to start drawing a single rectangle on the map
  // Returns a promise to indicate when drawing is done
  // Promise is resolved with bounds or rejected on cancel
  function startDrawing() {
    var dfd = $.Deferred();
    editableLayers.clearLayers();
    rectangle = new L.Draw.Rectangle(map, {
      "shapeOptions": shapeOptions
    });
    rectangle.enable();

    map.on(L.Draw.Event.CREATED, function (e) {
      var type = e.layerType,
        layer = e.layer;

      editableLayers.addLayer(layer);
      dfd.resolve(getBounds());
    });

    map.on('draw:drawstop', function (e) {
      dfd.reject("cancel");
    });

    return dfd.promise();
  }

  // Removes drawn bounds from map
  function removeBounds() {
    editableLayers.clearLayers();
    if (rectangle) {
      rectangle.disable();
      rectangle = null;
    }
    if (drawnRectangle) {
      drawnRectangle = null;
    }
  }

  // Adds a rectangle to map using passed in bounds object
  function addBounds(bounds) {
    editableLayers.clearLayers();
    drawnRectangle = L.rectangle([
      [bounds.lat_max, bounds.lon_max],
      [bounds.lat_min, bounds.lon_min]
    ], shapeOptions);
    editableLayers.addLayer(drawnRectangle);
  }

  // Returns a bounds object if there is a rectangle on the map
  function getBounds() {
    if (editableLayers.getLayers().length > 0) {

      var layer = editableLayers.getLayers()[0];
      var bounds = layer.getBounds();
      return {
        "lat_max": bounds.getNorth(),
        "lat_min": bounds.getSouth(),
        "lon_max": bounds.getEast(),
        "lon_min": bounds.getWest()
      };
    } else {
      return;
    }
  }

  // Removes event based layers
  function clearLayers() {
    toggleLayer(false, heatmap);
    toggleLayer(false, eventMarkers);
  }

  // Makes a heat map using the eventMarkers
  // Uses leaflet-heat.js
  function drawHeatMap() {
    clearLayers();
    var points = [];
    eventMarkers.eachLayer(function (marker) {
      points.push(marker.getLatLng());
    });
    heatmap = L.heatLayer(points, {
      radius: 15,
      blur: 20
    });
    map.addLayer(heatmap);
  }

  // Toogles given layer using passed bool
  function toggleLayer(show, layer) {
    if (show) {
      if (!map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }

  // Recolors all markers in the passed in style
  // Bypassed if alreadyColored
  function recolorMarkers(alreadyColored) {
    clearLayers();
    if(eventMarkers) {
      if (coloringName == "heat-map") {
        drawHeatMap();
        if (colorKey._map != null) {
          map.removeControl(colorKey);
        }
        if (magKey._map != null) {
          map.removeControl(magKey);
        }
      } else {
        if (!alreadyColored) {
          prepareSpectrum();
          eventMarkers.eachLayer(function (marker) {
            marker.setSizing(scaleMarkers);
            marker.setColoring();
          });
        }
        toggleLayer(true, eventMarkers);
      }
    }

  }

  // Sets rainbow coloring to be used on mapkey and icons
  function prepareSpectrum() {
    if (colors[coloringName] && (colors[coloringName].type == "time" || colors[coloringName].type == "magnitude")) {
      rainbow.setSpectrumByArray(colors[coloringName].fill);
      
      if (colorKey._map == null) {
        map.addControl(colorKey);
      }

      colorKey.recolor();
    } else {
      if (colorKey._map != null) {
        map.removeControl(colorKey);
      }
    }
  }

  function getMagIndex(mag) {
    if (!mag) {
      return -1;
    } else if (mag < 0.5) {
      return 0;
    } else if (mag > 2.2) {
      return 100;
    } else {
      return 100 * (mag - 0.5) / (2.2 - 0.5);
    }
  }

  // Makes new markers with given data and coloringName
  function updateMarkers(data) {
    clearLayers();

    var firstEventTime = new Date(data.features[0].properties.time);
    var lastEventTime = new Date(data.features[data.features.length - 1].properties.time);
    
    prepareSpectrum();

    //Go through all the data and create markers
    eventMarkers = L.geoJSON(data.features, {
      pointToLayer: function (feature, latlng) {
        var id = feature.properties.id,
          time = new Date(feature.properties.time),
          lat = latlng.lat,
          lng = latlng.lng,
          mag = feature.properties.magnitude ? feature.properties.magnitude : null,

          //timeIndex is used to assign coloring relative to start and end dates
          timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
          
        var magIndex = getMagIndex(mag);
        var magString = "<div>Magnitude (energy): " + (mag ? mag : "no data") + "</div>";
        var timeString = time.toISOString().replace("T", " ").replace(".000Z", "");

        //Defaults to black - gets overwritten
        var marker = new customMarker([lat, lng], {
          timeIndex: timeIndex,
          id: id,
          magIndex: magIndex
        });

        marker.setSizing(scaleMarkers);
        marker.setColoring();
        marker.bindPopup("<div> Time: " + timeString + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>" + magString)
          .on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
          });

        // do all the listy stuff
        if (data.features.length < 5000) {
          var listItem = $("<li class='tremor-event-nav event-" + id + "'><div>" + timeString + "</div><div>" + (mag ? "M" + mag : "no data") + "</div></li>");
          listItem.click(function () {
            $(this).addClass("active-event");
            marker.openPopup();
          }).on('mouseenter', function () {
            $(this).addClass("active-event");
            marker.setRadius(6);
          }).on('mouseout', function () {
            $(this).removeClass("active-event");
            marker.setSizing(scaleMarkers);
          });

          $("#event-list").prepend(listItem);

          marker.on('click', function () {
            $(".active-event").removeClass("active-event");
            listItem.addClass("active-event");
            $("#event-list").scrollTop(listItem[0].scrollHeight - 50);
          });


        }
        return marker;
      }
    });
    //update key top and bottom with colors?
    recolorMarkers(true);
  }

  function setColoring(color) {
    if(colors[color] || color == "heat-map"){
      coloringName = color;
    } else {
      coloringName = "red";
    }
  }

  function setSizing(show) {
    if(show) {
      scaleMarkers = true;
      map.addControl(magKey);
      //show key
    } else {
      scaleMarkers = false;
      map.removeControl(magKey);
      //hide key
    }
  }
  
  //** Methods available for external use */

  return {
    recolorMarkers: recolorMarkers,
    updateMarkers: updateMarkers,
    addBounds: addBounds,
    startDrawing: startDrawing,
    removeBounds: removeBounds,
    getBounds: getBounds,
    clearLayers: clearLayers,
    setColoring: setColoring,
    setSizing: setSizing,
    setRange: function(start, end){
      dateStart = start;
      dateEnd = end;
    }
  };

}