//Load base map from USGS https://apps.nationalmap.gov/services/ and MapBox
var hydro = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}',{
    attribution: 'USGS The National Map: National Hydrography Dataset',
    maxZoom:16}),
    topo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',{
        attribution: 'USGS The National Map: Orthoimagery and US Topo',
        maxZoom:16
    }),
    sat = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 22,
        id: 'mapbox.satellite',
        accessToken: 'pk.eyJ1IjoibWFyeS1iZWNrZXIiLCJhIjoiY2p3bTg0bDlqMDFkeTQzcDkxdjQ2Zm8yMSJ9._7mX0iT7OpPFGddTDO5XzQ'
    });

var baseMaps = {"NHD Hydro": hydro, "USGS Topo": topo, "MapBox Satellite": sat};

// Initial map view settings
var map = L.map('map', {zoomControl: false, attributionControl: false, layers:[hydro]});
var bounds = [[40.946713,-73.751221],[42.0839551, -71.7594548]];
map.fitBounds(bounds);
map.createPane('top');
map.getPane('top').style.zIndex=650;

// Controls on the map
L.control.attribution({position: 'bottomleft'}).addTo(map);
L.control.zoom({position:'topright'}).addTo(map);
L.control.layers(baseMaps).addTo(map);

var base = "https://services5.arcgis.com/ffJESZQ7ml5P9xH7/ArcGIS/rest/services/"
var s123 = "survey123_2bd9b97d23124dbfae7df325f106039b_stakeholder/"
var fsrv = "FeatureServer/0/"
var qury = "query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson"
var burl = base + s123 + fsrv + qury
console.log(burl);

// url for geojson layer of point data
// "https://services5.arcgis.com/ffJESZQ7ml5P9xH7/ArcGIS/rest/services/survey123_2bd9b97d23124dbfae7df325f106039b_stakeholder/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson"

// example url to get json image data.  200 is the id contained in the geojson point data
// "https://services5.arcgis.com/ffJESZQ7ml5P9xH7/arcgis/rest/services/survey123_2bd9b97d23124dbfae7df325f106039b_stakeholder/FeatureServer/0/200/attachments/?f=pjson&token="

// example to get image.  200 is the id contained in geojson point data.  130 is id from image json
// "https://services5.arcgis.com/ffJESZQ7ml5P9xH7/arcgis/rest/services/survey123_2bd9b97d23124dbfae7df325f106039b_stakeholder/FeatureServer/0/200/attachments/130"

//https://base_service(base)/survey_1_2_3/FeatureServer/0/ #attachment_id# (200) /attachments/ #image_id# (130)

d3.json("data/ctStateBoundary.geojson").then(function(bound){
    d3.json(burl).then(function(bloomwatchData){
        var img = {};
        ctFeatures = [];
    
        for(var i=0; i<bloomwatchData['features'].length; i++){
            if(bloomwatchData['features'][i]['properties']['stateprov'] == 'CT'){
                ctFeatures.push(bloomwatchData['features'][i])
            }
        }
    
        var ctBloomwatch = {type: 'FeatureCollection', features: ctFeatures};
        //console.log(ctBloomwatch);
    
        ctBloomwatch['features'][0]['id'] //one way
        ctBloomwatch['features'][0]['properties']['objectid'] //second way
    
        var global_to_aid = {};
        var aid_to_idx    = {};
        var uimgs = [];
        for(var i=0; i<ctBloomwatch['features'].length;i++){
            var aid = ctBloomwatch['features'][i]['id'];
            global_to_aid[ctBloomwatch['features'][i]['properties']['globalid']] = aid;
            aid_to_idx[aid] = i;
            var uimg = base + s123 + fsrv + aid +"/attachments/?f=pjson&token="
            uimgs.push(d3.json(uimg));
            ctBloomwatch['features'][i]['properties']['iids'] = []; 
        } 
    
        //console.log(global_to_aid);
        //console.log(aid_to_idx);
        Promise.all(uimgs).then(resolve_junk_response);
    
        function resolve_junk_response(junk_data){
            //console.log(junk_data);
            for(var i=0; i<junk_data.length;i++){
                for(var j=0; j<junk_data[i]['attachmentInfos'].length;j++){
                    var gid = junk_data[i]['attachmentInfos'][j]['parentGlobalId'];
                    var iid = junk_data[i]['attachmentInfos'][j]['id'];
                    var aid = global_to_aid[gid];
                    ctBloomwatch['features'][aid_to_idx[aid]]['properties']['iids'].push(iid);
                }
            }
            console.log(ctBloomwatch);
            console.log(d3.timeFormat("%Y-%m-%d")((ctBloomwatch['features'][92]['properties']['obsdate'])));
            //map layer drawing must go here, this is the synchronized section, AKA the end!!!
            //leaflet code here please.....
            drawMap(ctBloomwatch)

            // load GeoJSON of CT Boundary
            var linestyle = {"color": "#333333","weight": 2,};
            L.geoJson(bound,{style:linestyle}).addTo(map);
    
          
        }
    
        
        //},function(img_err){ console.log('img error...')} ); //img_data call
    },function(burl_err){ console.log('burl='+burl+' error...')}) //burl call
});



function drawMap(ctBloomwatch){

    // map.on("click", function(e){
    //     console.log(e.latlng);
    // });

    obsDate = [];
    for(var i=0; i<ctBloomwatch['features'].length; i++){
        od = ctBloomwatch['features'][i]['properties']['obsdate']
        if(od !=null && od !='' && od > 1577854861000){
            obsDate.push(od);
        } 
    }

    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#ffffff",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    var fdate = d3.timeFormat("%Y-%m-%d")

    const sites = L.geoJSON(ctBloomwatch, {
                        pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, geojsonMarkerOptions);
                        },
                        onEachFeature: function(feature, layer) {
                            
                            var props = layer.feature.properties;
                            var iurl  = base + s123 + fsrv + props['objectid'] + "/attachments/" + props['iids'][0];
                            var iurl2 = base + s123 + fsrv + props['objectid'] + "/attachments/" + props['iids'][1];
                            var iurl3 = base + s123 + fsrv + props['objectid'] + "/attachments/" + props['iids'][2];

                            
                        // set the fill color of layer based on its normalized data value
                        layer.setStyle({
                            radius: bloomSize(props['obsdate'], 1641013261000, 1672549261000, props['bloomExtent']),
                            fillColor: getColor(props['obsdate'], 1641013261000, 1672549261000, props['bloomExtent'])
                        });

                        if(props['iids'].length == 1){
                            var popupContent = `<b>${props['lakeName']}</b></br>
                            ${props['iids'][0]},${props['iids'][1]},${props['iids'][2]}</br>
                            Observed Date: ${fdate(props['obsdate'])}</br>
                            Observed Bloom: ${props['bloomExtent']}</br>
                            <img id='popupImg' src='${iurl}' alt = ${props['descriptPic1']}>`;
                        }
                        else if(props['iids'].length == 2){
                            var popupContent = `<b>${props['lakeName']}</b></br>
                            ${props['iids'][0]},${props['iids'][1]},${props['iids'][2]}</br>
                            Observed Date: ${fdate(props['obsdate'])}</br>
                            Observed Bloom: ${props['bloomExtent']}</br>
                            <img id='popupImg' src='${iurl}' alt = ${props['descriptPic1']}>
                            <img id='popupImg' src='${iurl2}' alt = ${props['descriptPic2']}>`;
                        }
                        else if(props['iids'].length == 3){
                            var popupContent = `<b>${props['lakeName']}</b></br>
                            ${props['iids'][0]},${props['iids'][1]},${props['iids'][2]}</br>
                            Observed Date: ${fdate(props['obsdate'])}</br>
                            Observed Bloom: ${props['bloomExtent']}</br>
                            <img id='popupImg' src='${iurl}' alt = ${props['descriptPic1']}>
                            <img id='popupImg' src='${iurl2}' alt = ${props['descriptPic2']}>
                            <img id='popupImg' src='${iurl3}' alt = ${props['descriptPic3']}>`;
                        }
                        else{
                            var popupContent = `<b>${props['lakeName']}</b></br>
                            ${props['iids'][0]},${props['iids'][1]},${props['iids'][2]}</br>
                            Observed Date: ${fdate(props['obsdate'])}</br>
                            Observed Bloom: ${props['bloomExtent']}</br>
                            <img id='popupImg' src='images/noImage.png' alt = 'No Image Available'>`
                        }

                        
                    
                        // // bind a tooltip to layer with county-specific information
                        layer.bindPopup(popupContent, {
                            maxWidth: 500
                        });

                        layer.on('click', function(e){
                            map.setView(e.target.getLatLng(), 10)
                        });
                    
                    }
    }).addTo(map);

                    sliderRange(obsDate);
                    addSliderInteraction(sites)

                    
}

function getColor(date, sdate, edate, bloom){
    if(date >= sdate && date <= edate && bloom != "No bloom present"){
        return "#009200"
    } else {
        return "#333333"
    }
};

function addSliderInteraction(sites){

    $( "#slider-range" ).on( "slide", function( event, ui ) {
        var vals = ui.values;

        // loop through each county layer to update the color and tooltip info
    sites.eachLayer(function (layer) {

        const props = layer.feature.properties;
        var fdate = d3.timeFormat("%Y-%m-%d");
        var iurl = base + s123 + fsrv + props['objectid'] + "/attachments/" + props['iids'][0];

        // set the fill color of layer based on data value
        layer.setStyle({
            radius: bloomSize(props['obsdate'], vals[0], vals[1], props['bloomExtent']),
            fillColor: getColor(props['obsdate'], vals[0], vals[1], props['bloomExtent'])
        });

        let popupContent = `<b>${props['lakeName']}</b></br>
                        Observed Date: ${fdate(props['obsdate'])}</br>
                        Observed Bloom: ${props['bloomExtent']}</br>
                        <img src="${iurl}" alt = "No Image Available" style="width:200px">`;
                    
                        // // bind a tooltip to layer with county-specific information
                        layer.bindPopup(popupContent, {
                            maxWidth: 200
                        });

                        layer.on('click', function(e){
                            map.setView(e.target.getLatLng(), 9)
                        });
                    
    }); 
        
      } );
    
};

function sliderRange(obsDate){
    $(function() {
        $("#slider-range").slider({
          range: true,
          min: d3.min(obsDate),
          max: d3.max(obsDate),
          values: [1641013261000, 1672549261000],
          slide: function( event, ui ) {
            $("#odate" ).val(d3.timeFormat('%Y-%m-%d')(ui.values[ 0 ]) + " - " + 
            d3.timeFormat('%Y-%m-%d')(ui.values[ 1 ]));
          }
        });
        $( "#odate" ).val(d3.timeFormat('%Y-%m-%d')($( "#slider-range" ).slider( "values", 0 )) +
          " - " + d3.timeFormat('%Y-%m-%d')($( "#slider-range" ).slider( "values", 1 )));
      }); 
}

function bloomSize(date, sdate, edate, extent){
    var s = ['Larger than a football field', 
             'Between a football field and a tennis court', 
             'Between a tennis court and a car',
             'Smaller than a car',
             'No bloom present']

    if(date >= sdate && date <= edate && extent == s[0]){
        return 16
    }
    if(date >= sdate && date <= edate && extent == s[1]){
        return 14
    }
    if(date >= sdate && date <= edate && extent == s[2]){
        return 12
    }
    if(date >= sdate && date <= edate && extent == s[3]){
        return 10
    } else {
        return 8
    }
}



