$(function(){
  var map = new L.Map('tremor-map').setView([51.505, -0.09], 13),
      osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});		

  $('.input-daterange,.datepicker').datepicker();
  
  var regions = [
    {name:"N Vancouver Island", id:"NV"}, 
    {name:"S Vancouver Island", id:"VI"},	
    {name:"N Washington", id:"NW"},	
    {name:"S Washington", id:"SW"},	
    {name:"N Oregon", id:"NO"},
    {name:"Central Oregon", id:"CO"},
    {name:"S Oregon", id:"SO"},
    {name:"N California", id:"NC"},	
    {name:"N Central California", id:"CC"} 
  ];
  
  map.addLayer(osm);
  var latlngs = [];
  var markers = {};
  $.each(allStations, function(i, station){
    var marker = L.marker([station.lat, station.lng], {icon:L.divIcon({className: "station region-" + station.region})});

    marker.addTo(map);
    marker.bindPopup("Station: " + station.station);
    latlngs.push([station.lat, station.lng]);
  });
  
  var first, last;
  $.each(events.markers, function(i, event){
    if(i==0){
      first = event.time;
    }else{
      last = event.time;
    }
    var time = event.time.replace(/[\s:]/g, "-");
    var marker = L.marker([event.lat, event.lng],{
        icon:L.divIcon({className: "event region-" + (event.region ? event.region : "unknown") + " event-"+ time }),
        riseOnHover:true
    });
    
    $("#event-nav ul").append($("<li class='event-nav' id=event-" + time + ">" + event.time + "</li>"));
    marker.addTo(map);
    marker.bindPopup("<div> Time: " + event.time + "</div> <div> Latitude: " + event.lat + "</div><div>Longitude: " + event.lng + "</div>");
    marker.on('mouseover', function(){
      $(".event-" + time).addClass("active-event");
    });
    marker.on('mouseout', function(){
      $(".event-" + time).removeClass("active-event");
    });
    latlngs.push([event.lat, event.lng]);

    markers["event-" + time] = marker;
  });
  
  var columns = {
    'dates': ['x'], 
    'all': ['ALL']
  };
  
  var k;
  $.each(regions, function(i, region){
    columns[region.id] = [];
    columns[region.id].push(region.id);
  });
  
  $.each(all_summary.total, function(i, event){
    k = i;
    columns.dates.push(event.date);
    columns.all.push(event.ALL);
    $.each(regions, function(i, region){
      columns[region.id].push(event[region.id]);
    });
  });
  
  console.log(k)
  
  var chartColumns = [columns.dates, columns.all];
  $.each(regions, function(i, region){
    chartColumns.push(columns[region.id]);
  });
  
  
  
  var chart = c3.generate({
    bindto: '#chart',
    data: {
      x: 'x',
      xFormat: '%m/%d/%Y',
      //        xFormat: '%Y%m%d', // 'xFormat' can be used as custom format of 'x'
      columns: chartColumns
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          format: '%Y-%m-%d'
        }
      }
    },
    point: {
      show: false
    },
    subchart: {
      show: true
    },
    zoom: {
      enabled: true
    },
    transition: {
      duration: 0
    }
  });

  var bounds = new L.LatLngBounds(latlngs);
  map.fitBounds(bounds);
  $.each(regions, function(i, region){
    $("#region-nav").append($("<li class='region-nav-toggle' id=region-" + region.id + " >" + region.name + "<div class='pull-right'> <input class='toggle-switch'></div></li>"));
  });

  $("#hours span").text(((new Date(first) - new Date(last)) / (1000 * 60 * 60)).toFixed(1));
  $("#epicenters span").text(events.markers.length);
  //clicking and stuff like that
  //can probably combine these
  $(".region-nav-toggle").mouseover(function(){
    $(this).addClass("active-nav");
    $("." + $(this)[0].id).addClass("active-station");
    
  });
  
  $(".region-nav-toggle").mouseleave(function(){
     $(this).removeClass("active-nav");
    $("." + $(this)[0].id).removeClass("active-station");
  });
  
  
  $(".event-nav").mouseover(function(){
     $(this).addClass("active-nav");
     markers[$(this)[0].id].setZIndexOffset(1000);
    $("." + $(this)[0].id).addClass("active-event");
  });

  $(".event-nav").mouseleave(function(){
     $(this).removeClass("active-nav");
     markers[$(this)[0].id].setZIndexOffset(1);
    $("." + $(this)[0].id).removeClass("active-event");
  });
  
  $(".event-nav").click(function(){
    markers[$(this)[0].id].openPopup();
  });

  $('.toggle-switch').attr({
    'data-toggle':'toggle',
    'type':'checkbox'
  });
  
  $('.toggle-switch').bootstrapToggle({
    on:"On",
    off:"Off",
    'size':'mini'
  });
  
  $('.toggle-switch').change(function(){
    console.log($(this).prop("checked"), $(this)[0].id);
  });
});      