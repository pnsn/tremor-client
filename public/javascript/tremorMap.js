var TremorMap = (function () {
  var map;
  //map layers
  var eventMarkers,
    heatmap,
    seismometers,
    pastTremor,
    plateContours;

  //remove event layers
  function clearLayers() {
    if (map.hasLayer(heatmap)) {
      map.removeLayer(heatmap);
    }
    if (map.hasLayer(eventMarkers)) {
      map.removeLayer(eventMarkers);
    }
  }

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
  
  return {

    buildMap: function (container, center, options) {
      map = new L.Map(container, options).setView(center, 5);
      var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
      var osm = new L.TileLayer(osmUrl, {
        attribution: osmAttrib
      });
      L.control.scale().addTo(map);
      map.addLayer(osm);
    },

    updateMarkers: function (events, coloring) {
      clearLayers();
      customMarker = L.CircleMarker.extend({
        options: {
          timeIndex: 0
        }
      });

      var markersArr = [];
      var firstEventTime = (new Date(events[0].time)).getTime();
      var lastEventTime = (new Date(events[events.length - 1].time)).getTime();
      console.log(events[0].time, events[events.length - 1].time);
      $.each(events, function (i, event) {
        var timeIndex = 0;
        if (lastEventTime > firstEventTime) {
          var time = (new Date(event.time)).getTime();
          timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
        }
        var marker = new customMarker([event.lat, event.lon], {
          color: "black",
          weight: 1,
          fillOpacity: 1,
          radius: 4,
          riseOnHover: true,
          timeIndex: timeIndex
        });

        if (events.length < 5000) {
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
            })
          $("#event-nav ul").append(listItem);
        }
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
        //TODO: onclick make sidebar scroll
        markersArr.push(marker);
      });

      eventMarkers = new L.layerGroup(markersArr);
      map.addLayer(eventMarkers);

      this.recolorMarkers(coloring);

      
    },

    recolorMarkers: function (coloring) {
      clearLayers();

      if (!map.hasLayer(eventMarkers)) {
        map.addLayer(eventMarkers);
      }

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

    playEvents: function () {

      if (!map.hasLayer(eventMarkers)) {
        map.addLayer(eventMarkers);
      }

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

    toggleSeismometers: function (show) {
      if (show) {
        if (!seismometers) {
          var icon = L.icon({
            iconUrl: 'assets/Station.png',
            iconSize: [10, 8]
          });
          seismometers = L.geoJSON(seismometersGeoJSON, {
            pointToLayer: function (feature, latlng) {
              return L.marker(latlng, {
                icon: icon
              }).bindPopup("<div>" + feature.properties.station + "</div>");
            }
          });
        }
        map.addLayer(seismometers);
      } else {
        map.removeLayer(seismometers);
      }
    },

    togglePastTremor: function (show) {
      if (show) {
        if (!pastTremor) {
          pastTremor = L.geoJSON(pastTremorGeoJSON, {
            style: pastTremorGeoJSON.properties.style
          });
        }
        map.addLayer(pastTremor);
      } else {
        map.removeLayer(pastTremor);
      }
    },

    togglePlateContours: function (show) {
      if (show) {
        if (!plateContours) {
          plateContours = L.geoJSON(contoursGeoJSON, {
            style: function (feature) {
              return feature.properties.style;
            }
          });
        }
        map.addLayer(plateContours);
      } else {
        map.removeLayer(plateContours);
      }
    }
  };
})();