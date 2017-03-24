var LBI = LBI || {};

LBI.businfo = (function () {

    //set up some global variables..
    var map,
        infowindow,
        json,
        geocoder;

    //update the map using results brought back from our on click or enter event..
    function updateMap() {
        var findStops = document.getElementById('findstops'),
            address = document.getElementById('address');

        findStops.addEventListener('click', function (e) {
            e.preventDefault();
            geoCodeAddress();
        });
        //search when enter is clicked..
        address.addEventListener('keydown', function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                geoCodeAddress();
            }
        });
    }

    function geoCodeAddress() {
        var address = document.getElementById('address').value,
            northEast,
            soouthwest,
            busStopUrl;

        //lets go and geocode our input data..
        geocoder.geocode({'address': address}, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                var viewport = results[0].geometry.viewport;

                //go get the bounded box..
                north = viewport.getNorthEast().lat();
                east = viewport.getNorthEast().lng();
                south = viewport.getSouthWest().lat();
                west = viewport.getSouthWest().lng();

                map.fitBounds(viewport);

                // now build the appropriate url..
                busStopUrl = 'http://digitaslbi-id-test.herokuapp.com/bus-stops?northEast=' + north + ',' + east + '&southWest=' + south + ',' + west + '';
                // console.log(busStopUrl);

                doAjaxRequest(busStopUrl);
            } else {
                console.log('Sorry but the following issue occurred: ' + status);
            }
            

        });
    }
    //create our ajax request..
    function doAjaxRequest(url) {

        //set our ajax options up here..
        var options = {
            type: "get",
            url: url,
            dataType: "jsonp",
            success: function (data) {
                //assign our json global variable with our local json data..
                json = data.markers;

                for (var i = 0; i < json.length; i++) {
                  
                    // Current object
                    var obj = json[i];

                        // Adding a new marker for the object
                        var marker = new google.maps.Marker({
                            position: new google.maps.LatLng(obj.lat, obj.lng),
                            map: map,
                            title: obj.name,
                            icon: '/img/busicon.png'
                        });
                    
                    // Adding a new info window for the object
                    var markerClicker = addClicker(marker, obj.name + '<br/>' + '<a href="http://digitaslbi-id-test.herokuapp.com/bus-stops/' + obj.id + '" class="bus-icon" data-id=' + obj.id + '>See bus details</a>');
                }

                // Adding a new click event listener for the object
                function addClicker (marker, content) {
                    google.maps.event.addListener(marker, 'click', function () {
                      
                        if (infowindow) {
                            infowindow.close();
                        }

                        infowindow = new google.maps.InfoWindow({content: content});
                        infowindow.open(map, marker);
                    });
                }

                //get our arrival times when links within markers are clicked..
                getArrivalTimes('.bus-icon', '#map-canvas');

            },
            //Create the map if we return successful only otherwise update our feedback panel..
            error: function (xhr, error) {
                console.log('Sorry but the following error occured: ' + error);
            }
        };
        //pass our options in here..
        $.ajax(options);
    }

    // function to get arrival info..
    function arrivalId(busId, el) {

        var options = {
                type: "get",
                url: 'http://digitaslbi-id-test.herokuapp.com/bus-stops/' + busId,
                dataType: "jsonp",
                success: function (data) {

                    var json = data.arrivals,
                        obj;

                    //loop through and get all the arrival details so we can reuse them in the info panel div.
                    for (var i = 0; i < json.length; i++) {
                        
                        obj = json[i];

                        console.log(obj);
                    }

                    //for in loop to get obj props
                    for (var key in obj) {

                        //build our feed back string to show bus info to our user..
                        var feedbackStr = '<h2>Bus Number ' + obj['routeId'] + ':</h2>Destination: ' + obj['destination'] + '<br/>Estimated Wait Time: ' + obj['estimatedWait'] + '<br/>Scheduled Time:' + obj['scheduledTime'] + '';

                        // console.log(busArrivals);
                        el.find('.bus-feed').html(feedbackStr);

                    }
                },
                error: function (xhr, error) {
                    console.log('Sorry but the following error occured: ' + error);
                }
            };

            $.ajax(options);
        
    }

    //function to get arrival times based on ID clicked..
    function getArrivalTimes(marker, el) {
        $(el).on('click', marker, function (e) {
            var $this = $(this),
                $infoPanel = $('.info-panel');
                
                busId = $this.attr('data-id');

                console.log(busId);

            e.preventDefault();
            arrivalId(busId, $infoPanel);
        });
    }

    //basic element helper function..
    function createEl(elementName, idName, appendToEl) {
        this.element = document.createElement(elementName);
        this.element.id = idName;
        document.getElementById(appendToEl).appendChild(element);
    }

    function initMap() {
        //update the geocoder variable..
        geocoder = new google.maps.Geocoder();

        // Giving the map some options
        var mapOptions = {
            zoom: 10,
            center: new google.maps.LatLng(51.45613, -0.0228166)
        };

        //lets go and create the map markup using the 'createEl' function..
        createEl('div', 'map-canvas', 'main');

        // Creating the map
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    }

    //build the google maps url asynchronously..
    function loadUrl(url) {
        var script = document.createElement('script');
        //load our scripts src and assign a callback to init our map function above..
        script.src = url;
        document.body.appendChild(script);
    }

    //handle geolocation..
    function geolocation() {

        if (navigator.geolocation) {
            var geolocationButton = '<a href="#" class="geolocate">Bus stops near me</a>',
                $form = $('.form-wrap'),
                $addressField = $form.find('#address');

            //add a button if geolocation is supported..
            $form.find('form').append(geolocationButton);

            // console.log('Geolocation supported!');
            
        } else {
            return;
        }

        function success(position) {
            var lat  = position.coords.latitude,
                lng = position.coords.longitude,
                latlng = new google.maps.LatLng(lat, lng);

            $('.geolocate').on('click', function (e) {
                e.preventDefault();
                //on click lets go and populate the input field..
                locateUser(latlng);
            });

            function locateUser(latlng) {
                geocoder.geocode({'latLng': latlng}, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {

                        console.log(results[0].formatted_address);
                        $addressField.val(results[0].formatted_address);

                    } else {
                        console.log('sorry an error occurred!' + status);
                    }
                });
            }
        }

        function error() {
            console.log("sorry an error occurred!");
        }

        navigator.geolocation.getCurrentPosition(success, error, {timeout : 5000});
    }

    return {
        initMap: initMap,
        loadUrl: loadUrl,
        updateMap: updateMap,
        geolocation: geolocation
    };

}());

$(document).ready(function () {
    LBI.businfo.loadUrl('https://maps.googleapis.com/maps/api/js?v=3.exp&callback=LBI.businfo.initMap');
    LBI.businfo.updateMap();
    LBI.businfo.geolocation();
});