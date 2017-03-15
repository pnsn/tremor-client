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
	
	//GET RID OF THIS IN PRODUCTION
	var regiony = [];
	
  $.each(allStations, function(i, station){
    var marker = L.marker([station.lat, station.lng], {icon:L.divIcon({className: "station hidden region-" + station.region})});
		
    marker.addTo(map);
    marker.bindPopup("Station: " + station.station);
    latlngs.push([station.lat, station.lng]);
  });
  
  var first, last;
	
  // var k;
  $.each(regions, function(i, region){
		regiony.push(region.id);
    // columns[region.id] = [];
    // columns[region.id].push(region.id);
  });
	
  $.each(events.markers, function(i, event){
    if(i === 0){
      first = event.time;
    } 
		if(i === events.markers.length - 1 ){
		  last = event.time;
		}
		
    var time = event.time.replace(/[\s:]/g, "-");

    var marker = L.marker([event.lat, event.lng],{
        icon:L.divIcon({className: "event region-all region-" + (event.region ? event.region : regiony[Math.floor(Math.random()*regiony.length)]) + " event-"+ time }),
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
  
  // var k;
  // $.each(regions, function(i, region){
  //   columns[region.id] = [];
  //   columns[region.id].push(region.id);
  // });
  //
  // $.each(all_summary.total, function(i, event){
  //   k = i;
  //   columns.dates.push(event.date);
  //   columns.all.push(event.ALL);
  //   $.each(regions, function(i, region){
  //     columns[region.id].push(event[region.id]);
  //   });
  // });
  //
  // console.log(k)
  //
  // var chartColumns = [columns.dates, columns.all];
  // $.each(regions, function(i, region){
  //   chartColumns.push(columns[region.id]);
  // });
  
  
  
  // var chart = c3.generate({
  //   bindto: '#chart',
  //   data: {
  //     x: 'x',
  //     xFormat: '%m/%d/%Y',
  //     //        xFormat: '%Y%m%d', // 'xFormat' can be used as custom format of 'x'
  //     columns: chartColumns
  //   },
  //   axis: {
  //     x: {
  //       type: 'timeseries',
  //       tick: {
  //         format: '%Y-%m-%d'
  //       }
  //     }
  //   },
  //   point: {
  //     show: false
  //   },
  //   subchart: {
  //     show: true
  //   },
  //   zoom: {
  //     enabled: true
  //   },
  //   transition: {
  //     duration: 0
  //   }
  // });

  var bounds = new L.LatLngBounds(latlngs);
  map.fitBounds(bounds);
          
	$("#region-nav").append($("<li class='region-nav-toggle' id=region-all>All<div class='pull-right'> <input id='toggle-region-all' class='toggle-switch region-all' checked></div></li>"))
  $.each(regions, function(i, region){
    $("#region-nav").append($("<li class='region-nav-toggle' id=region-"+region.id+">" + region.name + "<div class='pull-right'> <input id=toggle-region-" +region.id+" class='toggle-switch region-" + region.id +"'></div></li>"));
  });
 
  $("#hours span").text(((new Date(first) - new Date(last)) / (1000 * 60 * 60)).toFixed(1));
  
	$("#epicenters span").text(events.markers.length);
  //clicking and stuff like that
  //can probably combine these
	
  $(".region-nav-toggle").mouseover(function(){
    $(this).addClass("active-nav");
    $(".station." + $(this)[0].id).addClass("active-station").removeClass("hidden");
    
  });
  
  $(".region-nav-toggle").mouseleave(function(){
     $(this).removeClass("active-nav");
		 $(".station." + $(this)[0].id).removeClass("active-station");
		 if(!$(".station." + $(this)[0].id).hasClass("always-show")){
			 $(".station." + $(this)[0].id).addClass("hidden");
		 }
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
  
  $('.region-nav-toggle .toggle-switch').change(function(){
		var regionId = $(this)[0].id.replace("toggle-","");
		
		if($(this).prop("checked")){
			if(regionId  === "region-all"){
				$(".region-nav-toggle .toggle-switch:not(#toggle-region-all)").bootstrapToggle('off');
			} else if($("#toggle-region-all").prop("checked")){
				$("#toggle-region-all").bootstrapToggle('off');
			}
			$('.event.' + regionId).removeClass("hidden");

		} else {
			$('.event.' + regionId).addClass("hidden");
		}
  });
	
	$("#station-toggle .toggle-switch").change(function(){
		if($(this).prop("checked")){
			$(".station").removeClass("hidden").addClass("always-show");
		} else {
			$(".station").addClass("hidden").removeClass("always-show");
		}
		
	});
});      