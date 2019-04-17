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

  map = new L.Map(mapOptions.mapContainer, mapOptions.leafletOptions).setView(mapOptions.center, 5);

  var osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });

  map.addLayer(osm);
  L.control.scale().addTo(map);

  L.Control.Key = L.Control.extend({
    onAdd: function (map) {
      var div = L.DomUtil.create('div', 'map-key map-control');
      div.innerHTML = "<div id='key-end'></div><div><img src='./assets/tremor_key.png'/></div><div id='key-start'></div>";
      return div;
    },

    onRemove: function (map) {
      // Nothing to do here
    }
  });

  L.control.key = function (opts) {
    return new L.Control.Key(opts);
  };

  L.Control.Clear = L.Control.extend({
    onAdd: function (map) {
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom map-bounds');
      container.title = "remove filter";
      container.innerHTML = "remove filter";
      container.onclick = function(){
        filterMarkers();
        editableLayers.clearLayers();
      };
      return container;
    },
  
    onRemove: function (map) {
      // Nothing to do here
    }
  });
  
  L.control.clear = function (opts) {
    return new L.Control.Clear(opts);
  };

  L.Control.Draw = L.Control.extend({
    onAdd: function (map) {
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom map-bounds');
      container.innerHTML = "filter by area";
      container.title = "draw box to filter events";
      container.onclick = function(){
        self.HandlerPolyline = new L.Draw.Rectangle(map, {
                  shapeOptions: {
          color: '#083f08',
          weight: 2,
          fillOpacity: 0
        }
        });
        self.HandlerPolyline.enable();
      };
      return container;
    },
  
    onRemove: function (map) {
      // Nothing to do here
    }
  });


  L.control.draw = function (opts) {
    return new L.Control.Draw(opts);
  };



  $("#clear-bounds").click(function(){
    filterMarkers();
  });
  L.control.draw({position:'topright'}).addTo(map);
  L.control.clear({position:'topright'}).addTo(map);


  var editableLayers = new L.FeatureGroup();
  map.addLayer(editableLayers);

  // var drawControl = new L.Control.Draw({
  //   position:"topright",
  //   draw: {
  //     polygon: false,
  //     marker: false,
  //     polyline: false,
  //     circle: false,
  //     circlemarker: false,
  //     rectangle: {

  //     },
  //   }
  // });

  map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

    editableLayers.clearLayers();
    editableLayers.addLayer(layer);
    //filter now
    $("#clear-bounds").prop("disabled", false);
    filterMarkers(layer.getBounds());

});


  // add drawing

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


  function filterMarkers(bounds){
    console.log('filter!')
    var count = 0;

    eventMarkers.eachLayer(function (marker) {
      marker.remove();
      $(".event-"+marker.options.eId).hide();
      if(bounds && bounds.contains(marker.getLatLng()) || !bounds){
        $(".event-"+marker.options.eId).show();
        marker.addTo(map);
        count++;
      }

    });

    if(!bounds) {

    }
    $("#epicenters span").text(count);
    console.log(count);
  }
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
    toggleLayer(true, eventMarkers);

    switch (coloring) {
    case "color-time":
      var rainbow = new Rainbow();
      var rainbowDark = new Rainbow();
      rainbow.setSpectrum("#1737e5", "#14E7C8", "#2EEA11", "#ECD00E", "#ef0b25");
      rainbowDark.setSpectrum("#0B1B72", "#0A7364", "#177508", "#766807", "#770512");
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
    }
  }

  function updateMarkers(response, coloring) {
    clearLayers();
    var firstEventTime = moment.utc(response.features[0].properties.time);
    var lastEventTime = moment.utc(response.features[response.features.length - 1].properties.time);

    eventMarkers = L.geoJSON(response, {
      pointToLayer: function (feature, latlng) {
        var timeIndex;

        var time = moment.utc(feature.properties.time);
        var id = feature.properties.id;
        var lat = latlng.lat;
        var lng = latlng.lng;

        if (lastEventTime > firstEventTime) {
          var t = time;
          timeIndex = (t - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        }

        //Defaults to black - gets overwritten
        var marker = new customMarker([lat, lng], {
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9,
          radius: 4,
          riseOnHover: true,
          timeIndex: timeIndex,
          eId: id
        });

        // do all the listy stuff
        if (response.features.length < 5000) {
          var listItem = $("<li class='event-nav event-" + id + "'>" + time.format("YYYY-MM-DD HH:mm:ss") + " UTC" + "</li>");
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
        }

        marker.bindPopup("<div> Time: " + time.format("YYYY-MM-DD HH:mm:ss") + " UTC" + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>")
          .on('mouseover', function () {
            $(".active-event").removeClass("active-event");
            $(".event-" + id).addClass("active-event");
          });

        marker.on('click', function () {
          $(".active-event").removeClass("active-event");
          $(".event-" + id).addClass("active-event");
          $('#event-nav ul').scrollTop(listItem.position().top);
        });

        return marker;
      }
    });
    map.addLayer(eventMarkers);
    recolorMarkers(coloring);
  }

  return {

    recolorMarkers: recolorMarkers,

    updateMarkers: updateMarkers,

    toggleOverlays: function (show, overlay) {
      toggleLayer(show, overlays[overlay]);
    },

    filterMarkers: filterMarkers

  };

}