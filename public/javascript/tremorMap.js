// Makes a map 
var TremorMap = (function () {
  //This is the map
  var map;
  var playbackSpeed;
  //event map layers
  var eventMarkers,
      heatmap;

  //stores the overlays
  var overlays = {};

  var osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });

  // Allows storing of additional data in marker
  var customMarker = L.CircleMarker.extend({
    options: {
      timeIndex: 0
      // depth: ? Future feature
    }
  });

  var mapKey;
  L.Control.Key = L.Control.extend({
    onAdd: function(map) {
        var div = L.DomUtil.create('div', 'map-key');
        div.innerHTML = "<div id='key-start'></div><div><img src='./assets/tremor_key.png'/></div><div id='key-end'></div>";
        return div;
    },

    onRemove: function(map) {
        // Nothing to do here
    }
  });

  L.control.key = function(opts) {
    return new L.Control.Key(opts);
  }

  // Makes the overlays
  function makeLayers() {
    var icon = L.icon({
      iconUrl: 'assets/Station.png',
      iconSize: [10, 8]
    });
    overlays.seismometers = L.geoJSON(seismometersGeoJSON, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: icon
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
  }

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
  function toggleLayer (show, layer) {
    if (show) {
      if(!map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    } else {
      if(map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }

  function playHeatmap() {
    toggleLayer(false, heatmap);
    heatmap = new L.heatLayer([],{
      radius: 25
    }
    );
    map.addLayer(heatmap);

    var markersCopy = eventMarkers.getLayers();
    $.each(markersCopy, function (i, marker) {
      setTimeout(function () {
        heatmap.addLatLng(marker.getLatLng());
        if (i == markersCopy.length - 1) {
          $("#play-events").prop("disabled", false);
        }
      }, marker.options.timeIndex * playbackSpeed.val()); //change the 30 to .val() for someinput to change speed
    });

  }

  function playEvents(){
    toggleLayer(false, eventMarkers);

    var markersCopy = eventMarkers.getLayers();

    $.each(markersCopy, function (i, marker) {
      setTimeout(function () {
        map.addLayer(marker);

        setTimeout(function(){
          map.removeLayer(marker);
          if (i == markersCopy.length - 1) {
            setTimeout(function(){
              $("#play-events").prop("disabled", false);
              toggleLayer(true, eventMarkers);
            }, 100);
          }
        }, playbackSpeed.val() * 10);
      }, marker.options.timeIndex * playbackSpeed.val()); //change the 30 to .val() for someinput to change speed
    });

  }


  return {

    init: function (opts) {

      makeLayers();

      playbackSpeed = opts.playbackSpeed;

      map = new L.Map(opts.mapContainer, opts.leafletOptions).setView(opts.center, 5);

      map.addLayer(osm);

      L.control.scale().addTo(map);

    },

    //TODO: clean up list logic
    updateMarkers: function (response, coloring) {
      clearLayers();
      var firstEventTime = (new Date(response.features[0].properties.time)).getTime();
      var lastEventTime = (new Date(response.features[response.features.length - 1].properties.time)).getTime();
      eventMarkers = L.geoJSON(response, {
        pointToLayer: function(feature, latlng){
          var timeIndex = 0;

          var time = feature.properties.time;
          var id = feature.properties.id;
          var lat = latlng.lat;
          var lng = latlng.lng;

          if (lastEventTime > firstEventTime) {
            var t = (new Date(feature.properties.time)).getTime();
            timeIndex = (t - firstEventTime) / (lastEventTime - firstEventTime) * 100;
          }

          // console.log(timeIndex);

          //Defaults to black - gets overwritten
          var marker = new customMarker([lat, lng], {
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
            radius: 5,
            riseOnHover: true,
            timeIndex: timeIndex
          });

          // do all the listy stuff
          if(response.features.length < 5000 ) {
            var listItem = $("<li class='event-nav event-" + id + "'>" + time + "</li>");  
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

          marker.bindPopup("<div> Time: " + time + "</div> <div> Latitude: " + lat + "</div><div>Longitude: " + lng + "</div>")
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

      // eventMarkerGroups[index] = 
      console.log("done!"); 
      this.recolorMarkers(coloring);
    },

    recolorMarkers: function (coloring) {
      if(mapKey) {
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

          if(!mapKey) {
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
    },

    // Removes events from map and adds them one by one
    // FIXME: Takes a while to remove
    playFeatures: function () {
      //case switch for heatmap/markers
      if(map.hasLayer(heatmap)){
        playHeatmap();

      } else { //mapHas
        playEvents();

      }
    },
    toggleOverlays: function (show, overlay) {
      toggleLayer(show, overlays[overlay]);
    }

  };





})();