$(function () {
  var mapOptions = {
    minZoom: 5.5,
    zoomSnap: 0.5,
    preferCanvas: true
  };

  //map
  var tremorMap = buildMap([45.5122, -122.6587], mapOptions);

  //map layers
  var eventMarkers;
  var heatmap;
  var plateContours;
  var seismometers;
  var pastTremor;
  
  //for now start with a default
  //later default to today, and update with value from selector
  var startTime = $("#start-date").val() ?  $("#start-date").val() : "2018-03-01" ;//24 hours ago
  var endTime = $("#end-date").val() ? $("#end-date").val() : "2018-03-02";//now
  $("#start-date").val(startTime);
  $("#end-date").val(endTime);

  $("#play-events").prop('disabled', true); //should be disabled in HTML, but its not working

  //AUTOREFRESH THIS
  getEvents(startTime, endTime).done(function(response){
    eventMarkers = updateMarkers(response);
    tremorMap.addLayer(eventMarkers);
    //hide loading screen
    $("#play-events").prop("disabled", false);
    $("#loading").hide();
  });

  // BUTTONS AND CONTROLS START HERE

  $("#seismometers").change(function(){
    if($(this).is(":checked")) {
      if(!seismometers) {
        var icon = L.icon ({
          iconUrl: 'assets/Station.png',
          iconSize: [10, 8]
        });
        seismometers = L.geoJSON(seismometersGeoJSON, {
          pointToLayer: function(feature, latlng){
            return L.marker(latlng, {
              icon: icon
            }).bindPopup("<div>" + feature.properties.station + "</div>");
          }
        });
      }
      tremorMap.addLayer(seismometers);
    } else {
      tremorMap.removeLayer(seismometers);
    }
  });

  $("#past-tremor").change(function(){
    if($(this).is(":checked")) {
      if(!pastTremor) {
        pastTremor = L.geoJSON(pastTremorGeoJSON, {
          style: pastTremorGeoJSON.properties.style
        });
      }
      pastTremor.addTo(tremorMap);
    } else {
      tremorMap.removeLayer(pastTremor);
    }
  });

  $("#plate-contours").change(function(){
    if($(this).is(":checked")) {
      if(!plateContours) {
        plateContours = L.geoJSON(contoursGeoJSON, {
          style: function(feature) {
            return feature.properties.style;
          }
        });
      }
      plateContours.addTo(tremorMap);
    } else {
      tremorMap.removeLayer(plateContours);
    }
  });


  $('input[type=radio][name=coloringRadio]').change(function() {
    if($(this).val() == "heat-map") {
      tremorMap.removeLayer(eventMarkers);
      heatmap = drawHeatMap(eventMarkers);
      heatmap.addTo(tremorMap);
    } else {
      if(tremorMap.hasLayer(heatmap)){
        tremorMap.removeLayer(heatmap);
      }
      if(!tremorMap.hasLayer(eventMarkers)){
        tremorMap.addLayer(eventMarkers);
      }
      eventMarkers = recolorMarkers($(this).val(),eventMarkers);
    }
  });
  
  $("#play-events").click(function(){
    $("#play-events").prop("disabled", true);

    if(!tremorMap.hasLayer(eventMarkers)){
      tremorMap.addLayer(eventMarkers);
    }

    playEvents(eventMarkers);
  });


  //if there is only one value, use the same
  //change to lose focus ?
  $("#submit").click(function(){
    $("#loading").show();
    $("#play-events").prop('disabled', true);
    var start = $("#start-date").val();
    var end = $("#end-date").val();  
    if(start || end) {
      if(tremorMap.hasLayer(eventMarkers)){
        tremorMap.removeLayer(eventMarkers);
      }
      if(tremorMap.hasLayer(heatmap)){
        tremorMap.removeLayer(heatmap);
      }
      //clear out old stuff


      $("#event-nav ul").empty();

      //If there is only one value, assume same day
      start = start ? start : end;
      end = end ? end : start;

      getEvents(start, end).done(function(response){
        eventMarkers = updateMarkers(response);
        tremorMap.addLayer(eventMarkers);

        $("#play-events").prop('disabled', false);
        $("#loading").hide();
        //hide loading screen
      });
    }
  });
  //change start times
});      


  //Fetches events for given start and endtime
  //Returns json object
  function getEvents(start, end) {
    var request = $.ajax({
      url: "https://tremorapi.pnsn.org/v1.0/events?starttime="+start+ " &endtime=" + end,
      dataType: "json"
    });
    
    return request.done(function(response) {
      console.log("got the request, processing now")
      return response;
    }).fail(function(jqXHR, textStatus) {
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }

  //builds the leaflet map with given center and returns it
  //I just made it a function to get it out of the way
  function buildMap (center, options) {
    var map = new L.Map('tremor-map', options).setView(center, 5);
    
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    var osm = new L.TileLayer(osmUrl, { attribution: osmAttrib });

    L.control.scale().addTo(map);
    map.addLayer(osm);
    
    return map;
  }

  // Updates markers with new data
  function updateMarkers(events) {
    customMarker = L.CircleMarker.extend({
      options: {
        timeIndex: 0
      }
    });

    var markersArr = [];

    var firstEventTime = (new Date(events[0].time)).getTime();
    var lastEventTime = (new Date(events[events.length-1].time)).getTime();

    $.each(events, function (i, event) {
      var timeIndex = 0;
      if(lastEventTime > firstEventTime) {
        var time = (new Date(event.time)).getTime();
        timeIndex = (time-firstEventTime)/(lastEventTime-firstEventTime)*100;
      }

      var marker = new customMarker([event.lat, event.lon], {
        color: "black",
        weight: 1,
        fillOpacity: 1,
        radius: 4,
        riseOnHover: true,
        timeIndex: timeIndex
      });
  
      if(events.length < 5000) {
        var listItem = $("<li class='event-nav event-" + event.id + "'>" + event.time + "</li>");
        // $("body").click(function(){
        //   marker.closePopup();
        //   $(".event-" + event.id).removeClass("active-event");
        // });    
        
        listItem.click(function(){
            $(".active-event").removeClass("active-event");
            $(".event-" + event.id).addClass("active-event");
            marker.openPopup();
          })
          .on('mouseover', function(){
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

      marker.on('click', function(){
        $(".active-event").removeClass("active-event");
        $(".event-" + event.id).addClass("active-event");
        $('#event-nav ul').scrollTop(listItem.position().top);
      });

      //TODO: onclick make sidebar scroll

      markersArr.push(marker);
    });

    $("#epicenters span").text(markersArr.length);

    var markers = new L.layerGroup(markersArr);
    
    return recolorMarkers($('input[type=radio][name=coloringRadio]').val(), markers);
  }

  // Changes icon color, defaults to red
  function recolorMarkers(coloring, markers) {
    if(coloring == "color-time") {
      var rainbow = new Rainbow();
      rainbow.setSpectrum("blue", "cyan", "yellow", "red");
      markers.eachLayer(function(marker){
        marker.setStyle({
          fillColor: "#" + rainbow.colorAt(marker.options.timeIndex)
        });
      });
    } else{
      markers.eachLayer(function(marker){
        marker.setStyle({
          fillColor: "red"
        })
      });
    }
    return markers;
  }

  //plays events in some order
  //TODO: fix early stop problem
  function playEvents(markers){
    console.log("play");
    var markersCopy = markers.getLayers();

    markers.clearLayers();

    $.each(markersCopy, function(i, marker){
      if (i == 500) {console.log(marker.options.timeIndex)};
      setTimeout(function(){
        markers.addLayer(marker);

        if(i == markersCopy.length-1){
          $("#play-events").prop("disabled", false);
        }
      }, marker.options.timeIndex * 30); //change the 30 to .val() for someinput to change speed
    });
  }

  //Returns a heatmap layer using external heatmap library
  function drawHeatMap(markers){
    var points = [];

    markers.eachLayer(function(marker){
      points.push(marker.getLatLng());
    });
    
    var heat = L.heatLayer(points, {radius: 25});

    return heat;
  }