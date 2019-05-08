// Makes a map 
function TremorMap(config) {
  var map,
    eventMarkers,
    heatmap,
    overlays = {},
    mapKey,
    shapeOptions = config.boundsOptions,
    colors = config.coloringOptions.colors;

    L.Control.include({
      _refocusOnMap: L.Util.falseFn // Do nothing.
    });
  
  map = new L.Map(config.mapContainer, config.leafletOptions).setView(config.center, config.zoom);

  var osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });


  map.addLayer(osm);
  L.control.scale().addTo(map);

  L.Control.Key = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control');
      div.innerHTML = "<div class='end'></div><div id='key-colored'></div><div class='start'></div>";
      return div;
    },
    recolor: function(coloring) {
      var str = "";
      $.each(coloring.fill, function(i, color){
        str += "," + color;
      });
      $("#key-colored").css("background-image", "linear-gradient(to top" + str + ")");
      // background: linear-gradient(to right, purple, blue, cyan, green, yellow, orange, red);
    }
  });


  

  L.control.key = function (opts) {
    return new L.Control.Key(opts);
  };

  mapKey = L.control.key({
    position: 'topleft',
  });

  var rainbow = new Rainbow();
  var rainbowDark = new Rainbow();
  
  // Allows storing of additional data in marker
  var customMarker = L.CircleMarker.extend({
    options: {
      weight: config.markerOptions.weight,
      opacity: config.markerOptions.opacity,
      fillOpacity: config.markerOptions.fillOpacity,
      radius: config.markerOptions.radius,
      timeIndex: 0,
      id: "",
      fill: "white",
      outline: "black"
    },
    setColoring : function(coloring){
      if(colors[coloring]){
        if(colors[coloring].type ==  "spectrum") {
          this.setStyle({
            fillColor: "#" + rainbow.colorAt(this.options.timeIndex),
            color: "#" + rainbowDark.colorAt(this.options.timeIndex)
          });
        } else {
          this.setStyle({
            fillColor: colors[coloring].fill,
            color: colors[coloring].outline
          });
        } 
      }

    }
  });



  var editableLayers = new L.FeatureGroup();
  map.addLayer(editableLayers);



  var rectangle, drawnRectangle;

  function startDrawing(){
    var dfd = $.Deferred();
    editableLayers.clearLayers();
    rectangle = new L.Draw.Rectangle(map, {"shapeOptions": shapeOptions});
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

  function removeBounds(){
    editableLayers.clearLayers();
    if(rectangle) {
      rectangle.disable();
      rectangle = null;
    }
    if(drawnRectangle) {
      drawnRectangle = null;
    }
  }

  function addBounds(bounds){
    editableLayers.clearLayers();

    drawnRectangle = L.rectangle([[bounds.lat_max,bounds.lon_max],[bounds.lat_min,bounds.lon_min]], shapeOptions);

    editableLayers.addLayer(drawnRectangle);
  }

  function getBounds(){
    if(editableLayers.getLayers().length > 0) {
    
     var layer = editableLayers.getLayers()[0];
     var bounds = layer.getBounds();
      return {
        "lat_max" : bounds.getNorth(),
        "lat_min" : bounds.getSouth(),
        "lon_max" : bounds.getEast(),
        "lon_min" : bounds.getWest()
      };
    } else {
      return;
    }
  }

  overlays = {
    "Seismometers" : L.geoJSON(seismometersGeoJSON, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'assets/Station.png',
            iconSize: [10, 8]
          })
        }).bindPopup("<div>" + feature.properties.station + "</div>");
      }
    }),
    "Past Tremor" : L.geoJSON(pastTremorGeoJSON, {
      style: pastTremorGeoJSON.properties.style
    }),
    "JDF Plate Contours" : L.geoJSON(contoursGeoJSON, {
      style: function (feature) {
        return feature.properties.style;
      }
    })
  };

  L.control.layers({}, overlays).addTo(map);

  // Helper functions // 

  //removes event based layers
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

  function recolorMarkers(coloringName, alreadyColored) {
    clearLayers();

    if(coloringName == "heat-map") {
      drawHeatMap();
      if (mapKey._map != null) {
        map.removeControl(mapKey);
      }
    } else {
      if(!alreadyColored) {
        prepareSpectrum(colors[coloringName]);

        eventMarkers.eachLayer(function (marker) {
          marker.setColoring(coloringName);
        });
      }
      toggleLayer(true, eventMarkers);
    }
  }

  function prepareSpectrum(coloring){ 
    if(coloring && coloring.type == "spectrum") {
      rainbow.setSpectrumByArray(coloring.fill);
      rainbowDark.setSpectrumByArray(coloring.outline);
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

  function updateMarkers(response, coloringName) {
    clearLayers();

    var firstEventTime = new Date(response.features[0].properties.time);
    var lastEventTime = new Date(response.features[response.features.length - 1].properties.time);

    var timeIndex, time, id, lat, lng;
    
    prepareSpectrum(colors[coloringName]);

    eventMarkers = L.geoJSON(response.features, {
      pointToLayer: function (feature, latlng) {
        time = new Date(feature.properties.time);
        id = feature.properties.id;
        lat = latlng.lat;
        lng = latlng.lng;

        timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        
        //Defaults to black - gets overwritten
        var marker = new customMarker([lat, lng], {
          timeIndex: timeIndex,
          id: id,
        });

        marker.setColoring(coloringName);

        marker.bindPopup("<div> Time: " + feature.properties.time + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>")
        .on('mouseover', function () {
          $(".active-event").removeClass("active-event");
          $(".event-" + id).addClass("active-event");
        });

        // do all the listy stuff
        if (response.features.length < 5000) {
          var listItem = $("<li class='event-nav event-" + id + "'>" + feature.properties.time + "</li>");
          listItem.click(function () {
            $(".active-event").removeClass("active-event");
            $(this).addClass("active-event");
            marker.openPopup();
          }).on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(this).addClass("active-event");
          });

          marker.on('click', function () {
            $(".active-event").removeClass("active-event");
            listItem.addClass("active-event");
          });
          $("#event-list").append(listItem);
        }
        return marker;
      }
    });
    recolorMarkers(coloringName, true);
  }

  return {

    recolorMarkers: recolorMarkers,

    updateMarkers: updateMarkers,

    addBounds: addBounds,

    startDrawing: startDrawing,

    removeBounds: removeBounds,

    getBounds: getBounds,

    clearLayers: clearLayers,

  };

}