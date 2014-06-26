/*==============================================================================*
 *                               NDEx Angular Client Module
 *
 * Description : The module consists of services that define the Client. Our
 *               code will make use of the ndexService service to make high level
 *               calls to the rest server.
 *
 * Notes       : Code be reduced by setting $http headers
 *
 *==============================================================================*/


//angularjs suggested function closure
(function() {

    var ndexServiceApp = angular.module('ndexServiceApp', []);

    /****************************************************************************
     * description  : $http calls to rest server.
     * dependencies : $http and ndexConfigs
     * return       : promise with success and error methods
     ****************************************************************************/
    ndexServiceApp.factory('ndexService',function(ndexConfigs, ndexUtility, $http) {
        // define and initialize factory object
        var factory = {};

        /*---------------------------------------------------------------------*
         * Networks
         *---------------------------------------------------------------------*/
        factory.findNetworks = function (searchString) {
            var config = ndexConfigs.getNetworkSearchConfig(searchString);
            return $http(config);
        };

        factory.queryNetwork = function(networkId, terms, searchDepth) {
            var config = ndexConfigs.getNetworkQueryConfig(networkId, terms, searchDepth,
                0,    // skip blocks
                500  // block size for edges
            );

            return {success: function(success) {
                $http(config).success(function (network) {
                    console.log(JSON.stringify(network));
                    ndexUtility.updateNodeLabels(network);
                    ndexUtility.setNetwork(network);
                    //TODO add error check
                    success(network);
                    //errorHandler(Error("didnt work")
                    //)
                    //;
                });
            }
            }
        };

        // return factory object
        return factory;
    });

    /****************************************************************************
     * $http configuration service
     ****************************************************************************/
    ndexServiceApp.factory('ndexConfigs',function() {
        var factory = {};

        /*
        // sets a common default header for $http requests
        // TODO consider implementing once authorization is verified
        ndexServiceApp.run(function($http) {
            //$http.defaults.headers.common.Authorization = 'Basic ' + factory.getEncodedUser()
        });
        */

        factory.NdexServerURI = "http://test.ndexbio.org/rest/ndexbio-rest";
        //factory.NdexServerURI = "http://localhost:8080/ndexbio-rest";

        /*---------------------------------------------------------------------*
         * POST request configuration
         *---------------------------------------------------------------------*/
        factory.getPostConfig = function(url, postData){
            var config ={
                method: 'POST',
                url: factory.NdexServerURI + url,
                data: JSON.stringify(postData),
                headers: {
                    Authorization: "Basic " + factory.getEncodedUser()
                }
            }
            return config;
        };

        /*---------------------------------------------------------------------*
         * Returns the user's credentials as required by Basic Authentication base64
         * encoded.
         *---------------------------------------------------------------------*/
        factory.getEncodedUser = function () {
            if (localStorage.userId)
                return btoa(localStorage.username + ":" + localStorage.password);
            else
                return null;
        };

        /*---------------------------------------------------------------------*
         * Networks
         *---------------------------------------------------------------------*/

        factory.getNetworkSearchConfig = function(searchString){
            var url = "/networks/search/" + "contains";
            var postData = {
                searchString: searchString,
                top: 100,
                skip: 0
            };
            return this.getPostConfig(url, postData);
        };

        factory.getNetworkQueryConfig = function(networkId, startingTerms, searchDepth, skipBlocks, blockSize){
            // POST to NetworkAService
            console.log("searchType = " + "NEIGHBORHOOD");
            console.log("searchDepth = " + searchDepth);
            for (index in startingTerms){
                console.log("searchTerm " + index + " : " + startingTerms[index]);
            }
            var url = "/network/" + networkId + "/query/" + skipBlocks + "/" + blockSize;
            var postData = {
                startingTermStrings: startingTerms,
                searchType: "NEIGHBORHOOD",
                searchDepth: searchDepth
            };
            return this.getPostConfig(url, postData);
        }

        return factory;

    });

    /****************************************************************************
     * NDEx Utility Service
     ****************************************************************************/
    ndexServiceApp.factory('ndexUtility', function() {
        factory = {};

        factory.network = [];

        /*-----------------------------------------------------------------------*
         * networks
         *-----------------------------------------------------------------------*/
        factory.setNetwork = function(network){
            factory.networks = [];
            factory.addNetwork(network);
        };

        factory.addNetwork = function(network){
            factory.networks.push(network);
            $.each(network.terms, function(termId, term){
                term.network = network;
            });
            $.each(network.nodes, function(nodeId, node){
                node.network = network;
            });
            $.each(network.edges, function(edgeId, edge){
                edge.network = network;
            });
        };

        factory.getNetworkId = function(network){
            return factory.networks.indexOf(network);
        };

        factory.removeNetwork = function(network){
            factory.networks.remove(factory.networks.indexOf(network));
        };

        /*-----------------------------------------------------------------------*
         * create a nice label for a node
         *-----------------------------------------------------------------------*/
        factory.updateNodeLabels = function(network){
            $.each(network.nodes, function (id, node){
                network.nodeLabelMap[id] = factory.getNodeLabel(node, network) ;
            });
        };

        factory.getNodeLabel = function(node, network) {
            //if (!network) network = factory.getNodeNetwork(node);
            if ("name" in node && node.name && node.name != "")
                return node.name;
            else if ("represents" in node && node.represents && network.terms[node.represents])
                return factory.getTermLabel(network.terms[node.represents], network);
            else
                return "unknown"
        };

        factory.getNodeNetwork = function(node) {
            //TODO
            return {};
        };

        /*-----------------------------------------------------------------------*
         * Builds a term label based on the term type; labels rely on Base Terms,
         * which have names and namespaces. Function Terms can refer to other
         * Function Terms or Base Terms, and as such must be traversed until a Base
         * Term is reached.
         *-----------------------------------------------------------------------*/
        factory.getTermLabel = function(term, network) {
            //if (!network) network = factory.getTermNetwork(term);
            if (term.termType === "Base") {
                if (term.namespace) {
                    var namespace = network.namespaces[term.namespace];

                    if (!namespace || namespace.prefix === "LOCAL")
                        return term.name;
                    else if (!namespace.prefix)
                        return namespace.uri + term.name;
                    else
                        return namespace.prefix + ":" + term.name;
                }
                else
                    return term.name;
            }
            else if (term.termType === "Function") {
                var functionTerm = network.terms[term.termFunction];
                if (!functionTerm) {
                    console.log("no functionTerm by id " + term.termFunction);
                    return;
                }

                var functionLabel = factory.getTermLabel(functionTerm, network);
                functionLabel = factory.lookupFunctionAbbreviation(functionLabel);

                var sortedParameters = factory.getDictionaryKeysSorted(term.parameters);
                var parameterList = [];

                for (var parameterIndex = 0; parameterIndex < sortedParameters.length; parameterIndex++) {
                    var parameterId = term.parameters[sortedParameters[parameterIndex]];
                    var parameterTerm = network.terms[parameterId];

                    if (parameterTerm)
                        var parameterLabel = factory.getTermLabel(parameterTerm, network);
                    else
                        console.log("no parameterTerm by id " + parameterId);

                    parameterList.push(parameterLabel);
                }

                return functionLabel + "(" + parameterList.join(", ") + ")";
            }
            else
                return "Unknown";
        };

        factory.getTermNetwork = function(term) {
            //TODO
            return {};
        }


        /*-----------------------------------------------------------------------*
         * Returns the keys of a dictionary as a sorted array.
         *-----------------------------------------------------------------------*/
        factory.getDictionaryKeysSorted = function(dictionary)
        {
            var keys = [];
            for(var key in dictionary)
            {
                if(dictionary.hasOwnProperty(key))
                    keys.push(key);
            }

            return keys.sort();
        };

        /*-----------------------------------------------------------------------*
         * Looks-up abbreviations for term functions.
         *-----------------------------------------------------------------------*/
        factory.lookupFunctionAbbreviation = function(functionLabel) {
            var fl = functionLabel.toLowerCase();
            if (fl.match(/^bel:/)) fl = fl.replace(/^bel:/, '');
            switch (fl) {
                case "abundance":
                    return "a";
                case "biological_process":
                    return "bp";
                case "catalytic_activity":
                    return "cat";
                case "complex_abundance":
                    return "complex";
                case "pathology":
                    return "path";
                case "peptidase_activity":
                    return "pep";
                case "protein_abundance":
                    return "p";
                case "rna_abundance":
                    return "r";
                case "protein_modification":
                    return "pmod";
                case "transcriptional_activity":
                    return "trans";
                case "molecular_activity":
                    return "act";
                case "degradation":
                    return "deg";
                case "kinase_activity":
                    return "kin";
                default:
                    return fl;
            }
        };

        return factory;
    });

}) (); //end function closure