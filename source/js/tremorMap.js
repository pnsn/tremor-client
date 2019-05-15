//** Makes a map with passed in config options */
//** Leaflet map that adds dots from a geojson */
//** Requires external UI elements */
function TremorMap(config) {
  //** Instantiate some variables */

  var map, eventMarkers, heatmap, overlays, mapKey, osm,
    rectangle, drawnRectangle, customMarker, dateStart, dateEnd,
    shapeOptions = config.boundsOptions,
    colors = config.coloringOptions.colors,
    rainbow = new Rainbow(),
    editableLayers = new L.FeatureGroup();

  // Make the map
  map = new L.Map(config.mapContainer, config.leafletOptions).setView(config.center, config.zoom);

  //Make the basemap
  osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });

  //Make a key that can be recolored
  L.Control.Key = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control');
      div.innerHTML = "<div id='key-top'></div><div id='key-colored'></div><div id='key-bottom'></div><div id='key-no-data'><span> No Data: </span><div></div></div>";
      return div;
    },
    recolor: function (coloring) {
      if(coloring.type == "magnitude") {
        $("#key-top").text("Me = 2.0");
        $("#key-bottom").text("0.0");
        $("#key-no-data").show();
      } else {
        $("#key-top").text(dateEnd);
        $("#key-bottom").text(dateStart);
        $("#key-no-data").hide();
      }
      var str = "";
      $.each(coloring.fill, function (i, color) {
        str += "," + color;
      });
      $("#key-colored").css("background-image", "linear-gradient(to top" + str + ")");
    }
  });
  L.control.key = function (opts) {
    return new L.Control.Key(opts);
  };

  //Create a key (added to map later)
  mapKey = L.control.key({
    position: 'topleft',
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
      radius: config.markerOptions.radius,
      magIndex: -1,
      timeIndex: 0,
      id: "",
      fill: "white", //default
      outline: "black" //default
    },
    //sets spectrum or single color using config
    setColoring: function (coloring) {
      var fill;
      if (colors[coloring]) {
        switch (colors[coloring].type) {
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
            fill = colors[coloring].fill;
        }

        this.setStyle({
          fillColor: fill,
          color: colors[coloring].outline
        });


      }
    }
  });

  // Map overlays for leaflet overlay control
  overlays = {
    "Seismometers": L.geoJSON(seismometersGeoJSON, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'assets/Station.png',
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
  map.addLayer(osm); //background
  L.control.scale().addTo(map); //scale
  map.addLayer(editableLayers); //layers
  L.control.layers({}, overlays).addTo(map); //overlays

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
  function recolorMarkers(coloringName, alreadyColored) {
    clearLayers();

    if (coloringName == "heat-map") {
      drawHeatMap();
      if (mapKey._map != null) {
        map.removeControl(mapKey);
      }
    } else {
      if (!alreadyColored) {
        prepareSpectrum(colors[coloringName]);

        eventMarkers.eachLayer(function (marker) {
          marker.setColoring(coloringName);
        });
      }
      toggleLayer(true, eventMarkers);
    }
  }

  // Sets rainbow coloring to be used on mapkey and icons
  function prepareSpectrum(coloring) {
    if (coloring && coloring.type == "time" || coloring.type == "magnitude") {
      rainbow.setSpectrumByArray(coloring.fill);
      
      if (mapKey._map == null) {
        map.addControl(mapKey);
      }

      mapKey.recolor(coloring);
    } else {
      if (mapKey._map != null) {
        map.removeControl(mapKey);
      }
    }
  }

  // Makes new markers with given data and coloringName
  function updateMarkers(data, coloringName) {
    clearLayers();

    var firstEventTime = new Date(data.features[0].properties.time);
    var lastEventTime = new Date(data.features[data.features.length - 1].properties.time);

    var timeIndex, time, id, lat, lng;

    prepareSpectrum(colors[coloringName]);

    //Go through all the data and create markers
    eventMarkers = L.geoJSON(data.features, {
      pointToLayer: function (feature, latlng) {
        var id = feature.properties.id,
          time = new Date(feature.properties.time),
          lat = latlng.lat,
          lng = latlng.lng,
          mag = feature.properties.amplitude ? (Math.round(10*(Math.log10(feature.properties.amplitude)-2.7)/2)/10).toFixed(1): null,
          //timeIndex is used to assign coloring relative to start and end dates
          timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
          
          var magIndex = mag ? mag / 2 * 100 : -1,
          magString = "<div>Magnitude (energy): " + (mag ? mag : "no data") + "</div>";

          var timeString = time.toISOString().replace("T", " ").replace(".000Z", "");
        //Defaults to black - gets overwritten
        var marker = new customMarker([lat, lng], {
          timeIndex: timeIndex,
          id: id,
          magIndex: magIndex
        });

        marker.setColoring(coloringName);
        marker.bindPopup("<div> Time: " + timeString + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>" + magString)
          .on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
          });

        // do all the listy stuff
        if (data.features.length < 5000) {
          var listItem = $("<li class='event-nav event-" + id + "'><div>" + timeString + "</div><div>" + (mag ? "M" + mag : "no data") + "</div></li>");
          listItem.click(function () {
            $(this).addClass("active-event");
            marker.openPopup();
          }).on('mouseenter', function () {
            $(this).addClass("active-event");
            marker.setRadius(6);
          }).on('mouseout', function () {
            $(this).removeClass("active-event");
            marker.setRadius(config.markerOptions.radius);
          });

          marker.on('click', function () {
            $(".active-event").removeClass("active-event");
            listItem.addClass("active-event");
            $(".event-" + id)[0].scrollIntoView();
          });

          $("#event-list").prepend(listItem);
        }
        return marker;
      }
    });

    recolorMarkers(coloringName, true);
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
    setRange: function(start, end){
      dateStart = start;
      dateEnd = end;
    }
  };

}