$(function () {

    //map
   TremorMap.buildMap('tremor-map', [45.5122, -122.6587], {
      minZoom: 5.5,
      zoomSnap: 0.5,
      preferCanvas: true
    });
    
    var coloringRadio = $('input[type=radio][name=coloringRadio]');

    //for now start with a default
    //later default to today, and update with value from selector
    var startTime = $("#start-date").val() ?  $("#start-date").val() : "2018-02-01" ;//24 hours ago YYYY-mm-dd
    var endTime = $("#end-date").val() ? $("#end-date").val() : "2018-02-02";//now
    
    $("#start-date").val(startTime);
    $("#end-date").val(endTime);
  
    $("#play-events").prop('disabled', true); //should be disabled in HTML, but its not working
  

    console.log(coloringRadio.val())
    //AUTOREFRESH THIS
    getEvents(startTime, endTime).done(function(response){
        TremorMap.updateMarkers(response, coloringRadio.val());

        $("#epicenters span").text(response.length);
      
      //hide loading screen
      $("#play-events").prop("disabled", false);
      $("#loading").hide();
    });
  
    //AUTOREFRESH THIS
    getCounts().done(function(response){
      var chartData = [],
          formatTime = d3.utcFormat("%Y-%m-%d"),
          today = new Date();
          firstMeas = new Date(Object.keys(response)[0]);
  
      for (var d = firstMeas; d <= today; d.setDate(d.getDate() + 1)) {
        dString = formatTime(d);
        chartData.push({
          "date": new Date(d),
          "count": response[dString] ? response[dString] : 0
        });
      }

      TimeChart.init({
        container: "#chart",
        height: 100,
        width: 900,
        start: $("#start-date"),
        end: $("#end-date")
      }); //some height and some width;
  
      TimeChart.addData(chartData);
    });
  
    // BUTTONS AND CONTROLS START HERE
  
    $("#seismometers").change(function(){
        TremorMap.toggleSeismometers($(this).is(":checked"));
    });
  
    $("#past-tremor").change(function(){
        TremorMap.togglePastTremor($(this).is(":checked"));
    });
  
    $("#plate-contours").change(function(){
        TremorMap.togglePlateContours($(this).is(":checked"));
    });
  
  
    coloringRadio.change(function() {
        TremorMap.recolorMarkers($(this).val());
    });
    
    $("#play-events").click(function(){
      $("#play-events").prop("disabled", true);
  
      TremorMap.playEvents();
    });
  
    $("#start-date, #end-date").change(function(){
      
      var start = $("#start-date").val();
      var end = $("#end-date").val();  
  
      if(start && end && start < end) {
        TimeChart.updateBounds(start, end);
      }
    });
  
  
  
    //if there is only one value, use the same
    //change to lose focus ?
    $("#submit").click(function(){
      $("#loading").show();
      $("#play-events").prop('disabled', true);
      var start = $("#start-date").val();
      var end = $("#end-date").val();  
  
      // manualChartOverride(start, end);
      if(start || end) {
  
        $("#event-nav ul").empty();
  
        //If there is only one value, assume same day
        start = start ? start : end;
        end = end ? end : start;
  
        getEvents(start, end).done(function(response){
            TremorMap.updateMarkers(response, coloringRadio.val());
            $("#epicenters span").text(response.length);
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
        url: "https://tremorapi.pnsn.org/v1.0/events?starttime="+start+ "&endtime=" + end,
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
  
      //Fetches events for given start and endtime
    //Returns json object
    function getCounts() {
      var request = $.ajax({
        url: "https://tremorapi.pnsn.org/v1.0/day_counts",
        dataType: "json"
      });
  
      return request.done(function(response) {
        return response;
      }).fail(function(jqXHR, textStatus) {
        console.log(jqXHR.status);
        console.log("Request failed: " + textStatus + " ");
      }).promise();
    }
