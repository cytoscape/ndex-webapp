ndexApp.controller('networkViewController',
    ['config','ndexServiceCX', 'ndexService', 'ndexConfigs', 'cyService','cxNetworkUtils',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$routeParams', '$modal',
        '$route', '$filter', '$location','$http','$q',
        function (config, ndexServiceCX, ndexService, ndexConfigs, cyService, cxNetworkUtils,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $routeParams, $modal,
                  $route, $filter, $location, $http, $q)
        {
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);


            $scope.networkController = {};

            var networkController  = $scope.networkController;


            networkController.errors = []; // general page errors
            networkController.queryErrors = [];

            /**
             * Return the value of a given property in the network. I assume the perperty names a unique in network.
             * Property name is case sensitive.
             * @param networkProperties
             * @param propertyName
             * @returns {undefined}
             */
            var getNetworkProperty = function(networkProperties, propertyName)
            {
                if ('undefined'===typeof(networkProperties)) {
                    return undefined;
                }

                for( var i = 0; i < networkProperties.length; i++ ) {

                    if ((networkProperties[i].predicateString === propertyName)) {
                            return networkProperties[i].value ;
                    }
                }
            }


            //                  local functions

            var getNetworkAdmins = function()
            {
                ndexService.getNetworkMemberships(networkController.currentNetworkId, 'ADMIN',
                    function(networkAdmins)
                    {
                        for( var i = 0; i < networkAdmins.length; i++ )
                        {
                            var networkAdmin = networkAdmins[i];
                            if( networkAdmin.memberUUID == sharedProperties.getCurrentUserId() )
                            {
                                networkAdmins.splice(i, 1);
                            }
                        }
                        networkController.networkAdmins = networkAdmins;
                    },
                    function(error)
                    {

                    });
            };


            var drawCXNetworkOnCanvas = function (cxNetwork) {
                var attributeNameMap = {};

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                var cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);

                var layoutName = 'cose';

                if (cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                cyService.initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, networkController, 'cytoscape-canvas' );

            }
            
            var getNetworkAndDisplay = function (networkId, callback) {
                var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = config.networkTableLimit;
                var skipBlocks = 0;

                if ( networkController.currentNetwork.edgeCount > config.networkDisplayLimit) {
                    // get edges, convert to CX obj
                } else {
                    // get complete CX stream and build the CX network object.
                }
                
                (request2 = ndexServiceCX.getCXNetwork(networkId) )
                    .success(
                        function (network) {
                          //  csn = network; // csn is a debugging convenience variable
                   //         networkController.currentSubnetwork = network;
                   //         networkController.selectedEdges = network.edges;
                            callback(network);
                        }
                    )
                    .error(
                        function (error) {
                            if (error.status != 0) {
                                networkController.errors.push({label: "Get Network Edges Request: ", error: error});
                            } else {
                                networkController.errors.push({
                                    label: "Get Network Edges Request: ",
                                    error: "Process killed"
                                });
                            }
                        }
                    );
            }

            var initialize = function () {
                // vars to keep references to http calls to allow aborts
                var request1 = null;
                var request2 = null;

                // get network summary
                // keep a reference to the promise
                (request1 = ndexService.getNetwork(networkExternalId) )
                    .success(
                        function (network) {
                            cn = network;
                            networkController.currentNetwork = network;

                            if (!network.name) {
                                networkController.currentNetwork.name = "Untitled";
                            }

                            getMembership(function ()
                            {
                                networkController.showRetrieveMessage = false;
                                networkController.readyToRenderNetworkInUI = true;

                                if (network.visibility == 'PUBLIC'
                                    || networkController.isAdmin
                                    || networkController.canEdit
                                    || networkController.canRead) {

                                    var req = {
                                        'method': 'GET',
                                        'url': 'http://dev2.ndexbio.org/rest/network/' + networkExternalId + '/asCX'
                                    };

                                    $http(req
                                    ).success(
                                        function (response) {

                                            // response is a CX network
                                            // First convert it to niceCX to make it easy to update attributes
                                            var niceCX = cxNetworkUtils.rawCXtoNiceCX(response);

                                            console.log(niceCX);

                                            // attributeNameMap maps attribute names in niceCX to attribute names in cyjs.
                                            //
                                            // In some cases, such as 'id', 'source', and 'target', cyjs uses reserved names and
                                            // any attribute names that conflict with those reserved names must be mapped to other values.
                                            //
                                            // Also, cyjs requires that attribute names avoid special characters, so cx attribute names with
                                            // non-alpha numeric characters must also be transformed and mapped.
                                            //
                                            var attributeNameMap = {};

                                            /*----------------------------------

                                             Elements

                                             ----------------------------------*/

                                            var cyElements = cyService.cyElementsFromNiceCX(niceCX, attributeNameMap);

                                            console.log(cyElements);

                                            console.log(attributeNameMap);

                                            var cyStyle = cyService.cyStyleFromNiceCX(niceCX, attributeNameMap);
                                            console.log(cyStyle);

                                            var layoutName = 'cose';

                                            if (cyService.allNodesHaveUniquePositions(cyElements)) {
                                                layoutName = 'preset';
                                            }

                                            var cyLayout = {name: layoutName};

                                            cyService.initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas');

                                            var cyObject = cyService.getCy();
                                            console.log(cyObject);

                                        }
                                    ).error(
                                        function (response) {

                                            //console.log(JSON.stringify(response));

                                            console.log('Error querying NDEx: ' + JSON.stringify(response));

                                        }
                                    );
                                            //getNetworkAndDisplay(networkExternalId,drawCXNetworkOnCanvas);
                                }
                            });
                            
                            networkController.readOnlyChecked = cn.readOnlyCommitId > 0;
                            //getNetworkAdmins();

                            networkController.currentNetwork.SourceFormat =
                                getNetworkProperty(networkController.currentNetwork.properties, 'sourceFormat');
                            networkController.currentNetwork.reference =
                                getNetworkProperty(networkController.currentNetwork.properties,'reference');
                            networkController.currentNetwork.rightsHolder =
                                getNetworkProperty(networkController.currentNetwork.properties,'rightsHolder');
                            networkController.currentNetwork.rights =
                                getNetworkProperty(networkController.currentNetwork.properties,'rights');

                        }
                    )
                    .error(
                        function (error) {
                            networkController.showRetrieveMessage = false;
                            if ((error != null) && (typeof(error.message) !== 'undefined')) {
                                networkController.errors.push({label: "Unable to retrieve network. ", error: error.message});
                            } else {
                                networkController.errors.push({label: "Unable to retrieve network. ", error: "Unknown error."});
                            }
                        }
                    );

            };


            var getMembership = function (callback) {
                ndexService.getMyMembership(networkController.currentNetworkId,
                    function (membership)
                    {
                        if (membership && membership.permissions == 'ADMIN')
                        {
                            networkController.isAdmin = true;
                            networkController.privilegeLevel = "Admin";
                        }
                        if (membership && membership.permissions == 'WRITE')
                        {
                            networkController.canEdit = true;
                            networkController.privilegeLevel = "Edit";
                        }
                        if (membership && membership.permissions == 'READ')
                        {
                            networkController.canRead = true;
                            networkController.privilegeLevel = "Read";

                        }
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);


            initialize();


        }
        
     ]
);