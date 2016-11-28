ndexApp.controller('searchController',
    [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 'ndexNavigation', 'uiMisc',
        function (ndexService, sharedProperties, $scope, $location, $modal, ndexNavigation, uiMisc) {


            //              Controller Declarations/Initializations
            //---------------------------------------------------------------------
            $scope.searcher = {};
            var searchController = $scope.searcher;

            searchController.errors = [];
            searchController.pageSize = 1000;
            
            searchController.networkSearchResults = [];
            searchController.networkSearchInProgress = false;
            searchController.networkNoResults = false;
            searchController.numberOfNetworksFound = 0;
            searchController.networkSearchIncludeNetworksByGroupPermissions = true;
            searchController.networkSkipPages = 0;
            
            searchController.groupSearchResults = [];
            searchController.groupSearchInProgress = false;
            searchController.groupSearchNoResults = false;
            
            searchController.userSearchResults = [];
            searchController.userSearchInProgress = false;
            searchController.userSearchNoResults = false;

            //              Search Type and Search String
            //---------------------------------------------------------------------
            //
            // extract value of 'networks' from URI; URI looks something like
            // http://localhost:63342/ndex-webapp/index.html#/search?networks=test
            // NOTE: searchString can be 'undefined' in  case 'networks' name in the search portion of URI was
            // manually replaced with a non-existant value (i.e., 'abccba'); URI in this case may look like
            // http://localhost:63342/ndex-webapp/index.html#/search?abccba=test
            searchController.searchString = decodeURIComponent($location.search().searchString);
            searchController.searchType = decodeURIComponent($location.search().searchType);

            // Ensure that we have "search for all" as the default if no parameters are provided
            searchController.searchString = (searchController.searchString.toLowerCase() === 'undefined') ? "" : searchController.searchString;
            searchController.searchType = (searchController.searchType.toLowerCase() === 'undefined') ? "All" : searchController.searchType;

            // set $scope.main.searchString to searchController.searchString; - this ensures that $scope.main.searchString
            // stays the same (doesn't get reset) in the search window in case of page reload (F5);
            // $scope.main.searchString is "" (empty string) in case searchString is 'undefined'
            $scope.main.searchString = searchController.searchString;
            $scope.main.searchType = searchController.searchType;

            
            /*
             * This function removes most HTML tags and replaces them with markdown symbols so that this
             * field could be displayed in the title element of networkName.html template in the pop-up window
             * when mouse cursor hovers over it.
             */
            var stripHTML = function(html) {

                if (!html) {
                    return "";
                }

                return $("<html>"+html+"</html>").text();

                /*
                // convert HTML to markdown; toMarkdown is defined in to-markdown.min.js
                var markDown = toMarkdown(html);

                // after using toMarkdown() at previous statement, markDown var can still contain
                // some HTML Code (i.e.,<span class=...></span>). In order to remove it, we use jQuery text() function.
                // We need to add <html> and </html> in the beginning and of markDown variable; otherwise, markDown
                // will not be recognized by text() as a valid HTML and exception will be thrown.

                // Note that we need to use toMarkdown() followed by jQuery text(); if just jQuery text() is used, then
                // all new lines and </p> , </h1>...</h6> tags are removed; and all lines get "glued" together
                var markDownFinal  = $("<html>"+markDown+"</html>").text();

                return markDownFinal;
                */
            };

            $scope.activeTab = {

            };

            $scope.activateTab = function(tabName){
                $scope.activeTab = {};
                $scope.activeTab[tabName] = true;

            };



            /*---------------------------


             Network Table

             -----------------------------*/

            $scope.networkTabHeading = function(){
                if (searchController.networkSearchInProgress){
                    return 'Networks';
                } else if (searchController.networkSearchNoResults) {
                    return 'Networks (0)'
                } else {
                    return 'Networks (' + searchController.numberOfNetworksFound + ')';
                }
            };

            $scope.networkSearchGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,
                columnVirtualizationThreshold: 20,


                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });

                }
            };
            
            const NETWORK_COLUMN_FIELDS = [
                { field: 'Status', enableFiltering: true, width: 60, cellTemplate: 'pages/gridTemplates/networkStatus.html' },
                { field: 'Network Name', enableFiltering: true, minWidth: 440,
                    cellTemplate: 'pages/gridTemplates/networkName.html'},
                { field: ' ', enableFiltering: false, width:40, cellTemplate: 'pages/gridTemplates/downloadNetwork.html' },
                { field: 'Reference', enableFiltering: false, width: 90, cellTemplate: 'pages/gridTemplates/reference.html' },
                { field: 'Format', enableFiltering: true, minWidth: 70 },
                { field: 'Nodes', enableFiltering: false, minWidth: 70 },
                { field: 'Edges', enableFiltering: false, minWidth: 70 },
                { field: 'Visibility', enableFiltering: true, minWidth: 90 },
                { field: 'Owned By', enableFiltering: true, minWidth: 70,
                    cellTemplate: 'pages/gridTemplates/ownedBy.html'},
                { field: 'Last Modified', enableFiltering: false, minWidth: 100, cellFilter: "date:'short'" },

                { field: 'description', enableFiltering: false,  visible: false},
                { field: 'externalId',  enableFiltering: false,  visible: false},
                { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                { field: 'name',        enableFiltering: false,  visible: false}
            ];

            var populateNetworkTable = function()
            {
                $scope.networkGridApi.grid.options.columnDefs = NETWORK_COLUMN_FIELDS;
                refreshNetworkTable();
            };

            var refreshNetworkTable = function()
            {
                $scope.networkSearchGridOptions.data = [];

                for(var i = 0; i < searchController.networkSearchResults.length; i++ )
                {
                    var network = searchController.networkSearchResults[i];

                    var networkName = (!network['name']) ? "No name; UUID : " + network.externalId : network['name'];

                    var networkStatus = "success";
                    if (!network.isValid) {
                        if (network.errorMessage) {
                            networkStatus = "failed";
                        } else {
                            networkStatus = "processing";
                        }
                    }

                    if ((networkStatus == "success") && network.warnings && network.warnings.length > 0) {
                        networkStatus = "warning";
                    }

                    if ((networkStatus == "success") && network.warnings && network.warnings.length > 0) {
                        networkStatus = "warning";
                    }

                    var description = stripHTML(network['description']);
                    var externalId = network['externalId'];
                    var nodes = network['nodeCount'];
                    var edges = network['edgeCount'];
                    var owner = network['owner'];
                    var visibility = network['visibility'];
                    var modified = new Date( network['modificationTime'] );

                    var format = "Unknown";
                    for(var j = 0; j < network['properties'].length; j++ )
                    {
                        if( network['properties'][j]['predicateString'] == "ndex:sourceFormat" )
                        {
                            format = network['properties'][j]['value'];
                            break;
                        }

                    }
                    var download = "Download " + networkName;
                    var reference = uiMisc.getNetworkReferenceObj(network);

                    var row = {
                        "Status"        :   networkStatus,
                        "Network Name"  :   networkName,
                        " "             :   download,
                        "Reference"     :   reference,
                        "Format"        :   format,
                        "Nodes"         :   nodes,
                        "Edges"         :   edges,
                        "Visibility"    :   visibility,
                        "Owned By"      :   owner,
                        "Last Modified" :   modified,
                        "description"   :   description,
                        "externalId"    :   externalId,
                        "ownerUUID"     :   network['ownerUUID'],
                        "name"          :   networkName
                    };

                    $scope.networkSearchGridOptions.data.push(row);
                }
            };

            searchController.setAndDisplayCurrentNetwork = function (networkId) {
                $location.path("/network/" + networkId);
            };


            searchController.submitNetworkSearch = function () {

                searchController.numberOfNetworksFound = 0;
                searchController.networkSearchInProgress = true;
                searchController.networkSearchNoResults = false;

                searchController.networkQuery = {};
                searchController.networkQuery.accountName = searchController.userName;
                searchController.networkQuery.searchString = searchController.searchString;


                ndexService.searchNetworksV2(searchController.networkQuery, searchController.networkSkipPages, searchController.pageSize,
                    function (searchResult)
                    {
                        searchController.numberOfNetworksFound = searchResult.numFound;
                        searchController.networkSearchResultStart = searchResult.start;
                        var networks = searchResult.networks;
                        if(networks.length > 0){
                            searchController.networkSearchResults = networks;
                            populateNetworkTable();
                        } else {
                            searchController.networkSearchNoResults = true;
                        }
                        searchController.networkSearchInProgress = false;
                    },
                    function (error)
                    {
                        if (error) {
                            searchController.networkSearchResults = null;
                            searchController.errors.push(error.message);
                            searchController.networkSearchInProgress = false;
                            searchController.networkSearchNoResults = true;
                        }
                    });
            };

            /*---------------------------


             User Tab

             -----------------------------*/

            $scope.userTabHeading = function () {
                if (searchController.userSearchResults) {
                    var numUsers = searchController.userSearchResults.length;
                    var pageLimitPlusSign = '';
                    if (numUsers >= searchController.pageSize) {
                        pageLimitPlusSign = '+';
                    }
                    return 'Users (' + numUsers + pageLimitPlusSign + ')';
                }  else if (searchController.userSearchNoResults) {
                    return 'Users (0)'
                } else {
                    return 'Users';
                }
            };

            $scope.userSearchGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,


                onRegisterApi: function( gridApi )
                {
                    $scope.userGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });

                }
            };


            const USER_COLUMN_FIELDS = [
                {
                    field: 'User Name',
                    cellTemplate: 'pages/gridTemplates/userName.html'
                },
                { field: 'First Name'},
                { field: 'Last Name'},
                { field: 'Description'}

            ];

            var populateUserTable = function()
            {
                $scope.userGridApi.grid.options.columnDefs = USER_COLUMN_FIELDS;
                refreshUserTable();
                //console.log($scope.userSearchGridOptions.data);

            };

            var refreshUserTable = function()
            {
                $scope.userSearchGridOptions.data = [];

                for(var i = 0; i < searchController.userSearchResults.length; i++ )
                {
                    var user = searchController.userSearchResults[i];

                    var userName = user['userName'];
                    var description = stripHTML(user['description']);
                    var externalId = user['externalId'];
                    var firstName = user['firstName'];
                    var lastName = user['lastName'];


                    var row = {
                        "User Name"  :   userName,
                        "Description" :   description,
                        "externalId" : externalId,
                        "First Name" : firstName,
                        "Last Name" : lastName
                    };

                    $scope.userSearchGridOptions.data.push(row);
                }
                $scope.userGridApi.core.handleWindowResize();
            };

            searchController.submitUserSearch = function(){
                var searchString = searchController.searchString;
                searchController.userSearchResults = null;
                searchController.userSearchInProgress = true;
                searchController.userSearchNoResults = false;
                // We find only one page of users. No paging.
                ndexService.searchUsersV2(
                    searchString,
                    0,
                    searchController.pageSize,
                    function (users) {
                        if(users.numFound > 0){
                            searchController.userSearchResults = users.resultList;
                            //console.log(searchController.userSearchResults);
                            populateUserTable();
                        } else {
                            searchController.userSearchNoResults = true;
                        }
                        searchController.userSearchInProgress = false;
                    },
                    function (error) {
                        searchController.errors.push(error.data);
                        searchController.userSearchInProgress = false;
                    });
            };


            /*---------------------------


                    Group Tab

             -----------------------------*/

            $scope.groupTabHeading = function(){
                if (searchController.groupSearchResults){
                    var numGroups = searchController.groupSearchResults.length;
                    var pageLimitPlusSign = '';
                    if (numGroups >= searchController.pageSize){
                        pageLimitPlusSign = '+';
                    }
                    return 'Groups (' + numGroups + pageLimitPlusSign + ')';
                } else if (searchController.groupSearchNoResults) {
                    return 'Groups (0)'
                } else {
                    return 'Groups';
                }

            };

            $scope.groupSearchGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,


                onRegisterApi: function( gridApi )
                {
                    $scope.groupGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });

                }
            };


            const GROUP_COLUMN_FIELDS = [
                { field: 'Group Name',
                    cellTemplate: 'pages/gridTemplates/groupName.html'},
                /*
                {
                    field: 'Group Account',
                    cellTemplate: 'pages/gridTemplates/groupName.html'
                },
                */
                { field: 'Description'}

            ];

            var populateGroupTable = function()
            {
                $scope.groupGridApi.grid.options.columnDefs = GROUP_COLUMN_FIELDS;
                refreshGroupTable();

            };

            var refreshGroupTable = function()
            {
                $scope.groupSearchGridOptions.data = [];

                for(var i = 0; i < searchController.groupSearchResults.length; i++ )
                {
                    var group = searchController.groupSearchResults[i];
                    var groupName = group['groupName'];
                    var description = stripHTML(group['description']);
                    var externalId = group['externalId'];
                    //var userName = group['userName'];
                    
                    var row = {
                        "Group Name"  :   groupName,
                        "Description" :   description,
                        "externalId"  :   externalId

                        /*
                        "Group Account"   :   userName
                        */
                    };

                    $scope.groupSearchGridOptions.data.push(row);
                    //console.log($scope.groupSearchGridOptions);
                }
            };


            searchController.submitGroupSearch = function(){
                searchController.groupSearchResults = null;
                searchController.groupSearchInProgress = true;
                searchController.groupSearchNoResults = false;
                // We find only one page of groups. No paging.
                ndexService.searchGroupsV2(
                    searchController.searchString,
                    0,
                    searchController.pageSize,
                    function (groups) {
                        if (groups.numFound > 0){
                            searchController.groupSearchResults = groups.resultList;
                            ////console.log(searchController.groupSearchResults);
                            populateGroupTable();
                        } else {
                            searchController.groupSearchNoResults = true;
                        }
                        searchController.groupSearchInProgress = false;
                    },
                    function (error) {
                        searchController.errors.push(error.data);
                        searchController.groupSearchInProgress = false;
                        searchController.groupSearchNoResults = true;
                    });
            };


            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                uiMisc.showNetworkWarningsOrErrors(rowEntity, searchController.networkSearchResults);
            }

            $scope.getNetworkFromServerAndSaveToDisk = function(rowEntity) {

                uiMisc.getNetworkFromServerAndSaveToDisk(rowEntity);
            }


            /*---------------------------


             Perform the Search

             -----------------------------*/

            // set the state to no results for each tab so they default to showing that message
            searchController.groupSearchNoResults = true;
            searchController.userSearchNoResults = true;
            searchController.networkSearchNoResults = true;

            if (searchController.searchType === 'All'){
                searchController.submitNetworkSearch();
                searchController.submitGroupSearch();
                searchController.submitUserSearch();
                $scope.activateTab('Networks');
                /*
                console.log(!searchController.networkSearchNoResults + " " + !searchController.userSearchNoResults + "  " + !searchController.groupSearchNoResults);
                if (!searchController.networkSearchNoResults){
                    $scope.activateTab('Networks');
                } else if (!searchController.userSearchNoResults){
                    $scope.activateTab('Users');
                } else if (!searchController.groupSearchNoResults){
                    $scope.activateTab('Groups');
                } else {
                    
                }
                */

            } else if (searchController.searchType === 'Networks'){
                searchController.submitNetworkSearch();
                // Networks is active tab.
                // others are No Results
                $scope.activateTab('Networks');
            } else if (searchController.searchType === 'Users'){
                searchController.submitUserSearch();
                // Users is active tab.
                // others are No Results
                $scope.activateTab('Users');
            } else if (searchController.searchType === 'Groups'){
                searchController.submitGroupSearch();
                // Groups is active tab.
                // others are No Results
                $scope.activateTab('Groups');
            }

        }]);

