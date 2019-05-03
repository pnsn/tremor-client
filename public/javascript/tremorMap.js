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
    },
    setColoring : function(coloring){
      if(coloring == "color-time") {
        this.setStyle({
          fillColor: "#" + rainbow.colorAt(this.options.timeIndex),
          color: "#" + rainbowDark.colorAt(this.options.timeIndex)
        });
      } else if (coloring == "color-normal") {
        this.setStyle({
          fillColor: "#ef0b25",
          color: "#770512"
        });
      } else { //in case someone puts something weird in params
        this.setStyle({
          fillColor: "white",
          color: "black"
        });
      }
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

  map = new L.Map(mapOptions.mapContainer, mapOptions.leafletOptions).setView(mapOptions.center, mapOptions.zoom);

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

  var rectangle, drawnRectangle;

  function startDrawing(){
    editableLayers.clearLayers();
    rectangle = new L.Draw.Rectangle(map, drawOptions);
    rectangle.enable();
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
    drawnRectangle = L.rectangle([[bounds.lat_max,bounds.lon_max],[bounds.lat_min,bounds.lon_min]], drawOptions.shapeOptions);
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
      }
    } else {
      return;
    }


  }


  overlays["Seismometers"] = L.geoJSON(seismometersGeoJSON, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {
        icon: L.icon({
          iconUrl: 'assets/Station.png',
          iconSize: [10, 8]
        })
      }).bindPopup("<div>" + feature.properties.station + "</div>");
    }
  });

  overlays["Past Tremor"] = L.geoJSON(pastTremorGeoJSON, {
    style: pastTremorGeoJSON.properties.style
  });

  overlays["JDF Plate Contours"] = L.geoJSON(contoursGeoJSON, {
    style: function (feature) {
      return feature.properties.style;
    }
  });

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

  function recolorMarkers(coloring, alreadyColored) {
    if (mapKey) {
      map.removeControl(mapKey);
    }

    clearLayers();

    if(coloring == "heat-map") {
      drawHeatMap();
    } else {
      if(!alreadyColored) {
        eventMarkers.eachLayer(function (marker) {
          marker.setColoring(coloring);
        });
      }
      if(coloring == "color-time") {
        if (!mapKey) {
          mapKey = L.control.key({
            position: 'topleft',
          });
        }
        mapKey.addTo(map);
      }
      toggleLayer(true, eventMarkers);
    }
  }

  function updateMarkers(response, coloring) {
    clearLayers();

    var firstEventTime = new Date(response.features[0].properties.time);
    var lastEventTime = new Date(response.features[response.features.length - 1].properties.time);

    var timeIndex, time, id, lat, lng;

    eventMarkers = L.geoJSON(response.features, {
      pointToLayer: function (feature, latlng) {
        time = new Date(feature.properties.time);
        id = feature.properties.id;
        lat = latlng.lat;
        lng = latlng.lng;

        timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        
        //Defaults to black - gets overwritten
        var marker = new customMarker([lat, lng], {
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9,
          radius: 2.75,
          // riseOnHover: true,
          timeIndex: timeIndex,
          eId: id,
        });

        marker.setColoring(coloring);

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
            console.log(listItem.position().top, $('#event-list').scrollTop());

            $('#event-list').scrollTop(listItem.position().top - $('#event-list').scrollTop());
            console.log(listItem.position().top, $('#event-list').scrollTop());
          });
          $("#event-list").append(listItem);
        }
        return marker;
      }
    });
    recolorMarkers(coloring, true);
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