// Makes a map 
var TremorMap = (function () {
  //This is the map
  var map;

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

  return {

    init: function (opts) {

      makeLayers();

      map = new L.Map(opts.mapContainer, opts.leafletOptions).setView(opts.center, 5);

      map.addLayer(osm);

      L.control.scale().addTo(map);

    },


    //TODO: clean up list logic
    updateMarkers: function (events, coloring) {
      clearLayers();

      var markersArr = [];
      var firstEventTime = (new Date(events[0].time)).getTime();
      var lastEventTime = (new Date(events[events.length - 1].time)).getTime();

      $.each(events, function (i, event) {

        //Time index used for coloring and playback
        //What percent of the way through the selected time the event is
        var timeIndex = 0;

        if (lastEventTime > firstEventTime) {
          var time = (new Date(event.time)).getTime();
          timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        }

        //Defaults to black - gets overwritten
        var marker = new customMarker([event.lat, event.lon], {
          color: "black", //outline Color
          weight: 1,
          fillOpacity: 1,
          radius: 4,
          riseOnHover: true,
          timeIndex: timeIndex
        });

        if(events.length < 5000 ) {

          var listItem = $("<li class='event-nav event-" + event.id + "'>" + event.time + "</li>");
          // $("body").click(function(){
          //   marker.closePopup();
          //   $(".event-" + event.id).removeClass("active-event");
          // });    
          listItem.click(function () {
              $(".active-event").removeClass("active-event");
              $(".event-" + event.id).addClass("active-event");
              marker.openPopup();
          })
              .on('mouseover', function () {
              $(".active-event").removeClass("active-event");
              $(".event-" + event.id).addClass("active-event");
              });

              marker.bindPopup("<div> Time: " + event.time + "</div> <div> Latitude: " + event.lat + "</div><div>Longitude: " + event.lon + "</div>")
              .on('mouseover', function () {
                $(".active-event").removeClass("active-event");
                $(".event-" + event.id).addClass("active-event");
              });
    
            marker.on('click', function () {
              $(".active-event").removeClass("active-event");
              $(".event-" + event.id).addClass("active-event");
              $('#event-nav ul').scrollTop(listItem.position().top);
            });
          $("#event-list").append(listItem);
        }

        //TODO: onclick make sidebar scroll
        markersArr.push(marker);
      });

      eventMarkers = new L.layerGroup(markersArr);
      map.addLayer(eventMarkers);

      this.recolorMarkers(coloring);


    },

    recolorMarkers: function (coloring) {
      clearLayers();

      toggleLayer(true, eventMarkers);

      switch (coloring) {
        case "color-time":
          var rainbow = new Rainbow();
          rainbow.setSpectrum("blue", "cyan", "yellow", "red");
          eventMarkers.eachLayer(function (marker) {
            marker.setStyle({
              fillColor: "#" + rainbow.colorAt(marker.options.timeIndex)
            });
          });

          break;
        case "heat-map":
          drawHeatMap();
          break;

        default: 
          eventMarkers.eachLayer(function (marker) {
            marker.setStyle({
              fillColor: "red"
            });
          });      
      }
    },

    // Removes events from map and adds them one by one
    // FIXME: Takes a while to remove
    playEvents: function () {
      toggleLayer(true, eventMarkers);

      var markersCopy = eventMarkers.getLayers();
      eventMarkers.clearLayers();
      $.each(markersCopy, function (i, marker) {
        setTimeout(function () {
          eventMarkers.addLayer(marker);
          if (i == markersCopy.length - 1) {
            $("#play-events").prop("disabled", false);
          }
        }, marker.options.timeIndex * 30); //change the 30 to .val() for someinput to change speed
      });
    },

    toggleOverlays: function (show, overlay) {
      toggleLayer(show, overlays[overlay]);
    }
  };
})();