// Makes a map 
var TremorMap = (function () {
  //This is the map
  var map;
  var playbackSpeed;
  //event map layers
  var eventMarkers,
      heatmap;

  // array of layer groups
  //Index is the time index
  var eventMarkerGroups = [];

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

      eventMarkers = new L.layerGroup();
      var getInterval = function(quake) {
        console.log
        // earthquake data only has a time, so we'll use that as a "start"
        // and the "end" will be that + some value based on magnitude
        // 18000000 = 30 minutes, so a quake of magnitude 5 would show on the
        // map for 150 minutes or 2.5 hours
        return {
          start: quake.time,
          end:   quake.time + 1800000
        };
      };

      var timelineControl = L.timelineSliderControl({
        formatOutput: function(date){
          return d3.utcParse("%Y-%m-%d")(date);
        }
      });

      console.log(response)

      var timeline = L.timeline(response, {
        getInterval: getInterval,
        pointToLayer: function(feature, latlng){
          console.log(feature);
          var timeIndex = 0;

          if (lastEventTime > firstEventTime) {
            var time = (new Date(feature.time)).getTime();
            timeIndex = (time - firstEventTime) / (lastEventTime - firstEventTime) * 100;
          }

          // console.log(timeIndex);

          //Defaults to black - gets overwritten
          var marker = new customMarker([feature.lat, feature.lon], {
            color: "black", //outline Color
            weight: 1,
            fillOpacity: 1,
            radius: 4,
            riseOnHover: true,
            timeIndex: timeIndex
          });

          // // do all the listy stuff
          // if(response.features.length < 5000 ) {
          //   var listItem = $("<li class='event-nav event-" + feature.id + "'>" + feature.time + "</li>");  
          //   listItem.click(function () {
          //       $(".active-event").removeClass("active-event");
          //       $(".event-" + feature.id).addClass("active-event");
          //       marker.openPopup();
          //   }).on('mouseover', function () {
          //       $(".active-event").removeClass("active-event");
          //       $(".event-" + feature.id).addClass("active-event");
          //     });

          //     marker.on('click', function () {
          //       $('#event-nav ul').scrollTop(listItem.position().top);
          //     });

          //     $("#event-list").append(listItem);
          // }

          // marker.bindPopup("<div> Time: " + feature.time + "</div> <div> Latitude: " + feature.lat + "</div><div>Longitude: " + feature.lon + "</div>")
          // .on('mouseover', function () {
          //   $(".active-event").removeClass("active-event");
          //   $(".event-" + feature.id).addClass("active-event");
          // });
  
          // marker.on('click', function () {
          //   $(".active-event").removeClass("active-event");
          //   $(".event-" + feature.id).addClass("active-event");
          //   $('#event-nav ul').scrollTop(listItem.position().top);
          // });
          
          return marker;
        }
      });
      console.log(timeline)
      timelineControl.addTo(map);
      timelineControl.addTimelines(timeline);
      timeline.addTo(map);
      // timeline.on('change', function(e){
      //   updateList(e.target);
      // });
      
      // map.addLayer(eventMarkers);

      // eventMarkerGroups[index] = 
      console.log("done!"); 
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