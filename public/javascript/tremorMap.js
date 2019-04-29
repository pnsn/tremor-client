// Makes a map 
function TremorMap(mapOptions) {

  var map,
    eventMarkers,
    heatmap,
    overlays = {},
    mapKey;

  // Allows storing of additional data in marker
  var customMarker = L.CircleMarker.extend({
    options: {
      timeIndex: 0,
      eId: ""
      // depth: ? Future feature
    }
  });

  var drawOptions =  {
    shapeOptions: {
      color: '#083f08',
      weight: 2,
      fillOpacity: 0,
      opacity: 1
    }
  };   

  var rainbow = new Rainbow();
  var rainbowDark = new Rainbow();
  rainbow.setSpectrum("#1737e5", "#14E7C8", "#2EEA11", "#ECD00E", "#ef0b25");
  rainbowDark.setSpectrum("#0B1B72", "#0A7364", "#177508", "#766807", "#770512");

  map = new L.Map(mapOptions.mapContainer, mapOptions.leafletOptions).setView(mapOptions.center, 5);

  var osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });

  map.addLayer(osm);
  L.control.scale().addTo(map);

  L.Control.Key = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control');
      div.innerHTML = "<div class='end'></div><div><img src='./assets/tremor_key.png'/></div><div class='start'></div>";
      return div;
    },

    onRemove: function (map) {
      // Nothing to do here
    }
  });

  L.control.key = function (opts) {
    return new L.Control.Key(opts);
  };
  

  var editableLayers = new L.FeatureGroup();
  map.addLayer(editableLayers);

  map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

    editableLayers.addLayer(layer);
  });

  var rectangle;

  function startDrawing(){
    editableLayers.clearLayers();
    rectangle = new L.Draw.Rectangle(map, drawOptions);
    rectangle.enable();
  }

  function removeBounds(){
    editableLayers.clearLayers();
    rectangle.disable();
    rectangle = null;
  }

  function addBounds(bounds){
    editableLayers.clearLayers();
    rectangle = L.rectangle([[bounds.lat_max,bounds.lon_max],[bounds.lat_min,bounds.lon_min]], drawOptions.shapeOptions);
    editableLayers.addLayer(rectangle);
  };

  function getBounds(){
    if(editableLayers.getLayers().length > 0) {
    
     var layer = editableLayers.getLayers()[0];
     var bounds = layer.getBounds();
      return {
        "lat_max" : bounds.getNorth(),
        "lat_min" : bounds.getSouth(),
        "lon_max" : bounds.getEast(),
        "lon_min" : bounds.getWest()
      }
    } else {
      return;
    }


  }


  overlays.seismometers = L.geoJSON(seismometersGeoJSON, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {
        icon: L.icon({
          iconUrl: 'assets/Station.png',
          iconSize: [10, 8]
        })
      }).bindPopup("<div>" + feature.properties.station + "</div>");
    }
  });

  overlays.pastTremor = L.geoJSON(pastTremorGeoJSON, {
    style: pastTremorGeoJSON.properties.style
  });

  overlays.plateContours = L.geoJSON(contoursGeoJSON, {
    style: function (feature) {
      return feature.properties.style;
    }
  });

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
      radius: 25
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

  function recolorMarkers(coloring) {

    if (mapKey) {
      map.removeControl(mapKey);
    }
    clearLayers();


    switch (coloring) {
    case "color-time":
      eventMarkers.eachLayer(function (marker) {
        marker.setStyle({
          fillColor: "#" + rainbow.colorAt(marker.options.timeIndex),
          color: "#" + rainbowDark.colorAt(marker.options.timeIndex)
        });
      });

      if (!mapKey) {
        mapKey = L.control.key({
          position: 'topleft',
        });
      }

      mapKey.addTo(map);
      toggleLayer(true, eventMarkers);
      break;
    case "heat-map":
      drawHeatMap();
      break;

    default:
      eventMarkers.eachLayer(function (marker) {
          marker.setStyle({
            fillColor: "#ef0b25",
            color: "#770512"
          });
        });
      toggleLayer(true, eventMarkers);
    }
  }

  function updateMarkers(response, coloring) {
    console.log("update");
    clearLayers();
    var firstEventTime = new Date(response.features[0].properties.time);
    var lastEventTime = new Date(response.features[response.features.length - 1].properties.time);

    var timeIndex, time, id, lat, lng, marker, listItem;

    eventMarkers = L.geoJSON(response.features, {
      pointToLayer: function (feature, latlng) {
        time = new Date(feature.properties.time);
        id = feature.properties.id;
        lat = latlng.lat;
        lng = latlng.lng;

        timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        
        //Defaults to black - gets overwritten
        marker = new customMarker([lat, lng], {
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9,
          radius: 4,
          riseOnHover: true,
          timeIndex: timeIndex,
          eId: id,
        });

        // do all the listy stuff
        if (response.features.length < 5000) {
          listItem = $("<li class='event-nav event-" + id + "'>" + feature.properties.time + "</li>");
          listItem.click(function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
            marker.openPopup();
          }).on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
          });

          marker.on('click', function () {
            $('#event-nav ul').scrollTop(listItem.position().top);
          });

          $("#event-list").append(listItem);
          marker.on('click', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
            $('#event-nav ul').scrollTop(listItem.position().top);
          });
        }

        marker.bindPopup("<div> Time: " + feature.properties.time + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>")
          .on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
          });

        return marker;
      }
    });

    recolorMarkers(coloring);
  }

  return {

    recolorMarkers: recolorMarkers,

    updateMarkers: updateMarkers,

    toggleOverlays: function (show, overlay) {
      toggleLayer(show, overlays[overlay]);
    },

    addBounds: addBounds,

    startDrawing: startDrawing,

    removeBounds: removeBounds,

    getBounds: getBounds,

    clear: function () {
      clearLayers();
    },

  };

}