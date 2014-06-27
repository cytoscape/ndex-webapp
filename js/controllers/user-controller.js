ndexApp.controller('userController', function (ndexService, ndexUtility, $scope, $http, $location, sharedProperties) {

    //                               refactoring
    //------------------------------------------------------------------------------------//
    controller = this;
    //tab functionality
    controller.activeTab = 'networks';

    controller.isTabSet = function(div) {
        return controller.activeTab === div;
    };

    controller.setTab = function(div) {
        controller.activeTab = div;
    };
    //


    //------------------------------------------------------------------------------------//

    // This controller displays the user designated by
    // sharedProperties.displayedUserId
    //
    // if that value is null or undefined, then this controller displays the signed in user.
    // (selecting myAccount in the menu bar sets displayed user to null)
    //
    // If a user is selected in a search, the action will be  to set
    // sharedProperties.displayedUserId and then invoke this controller
    //
    if (sharedProperties.displayedUserId){
        $scope.displayedUserId = sharedProperties.displayedUserId;
    } else {
        $scope.displayedUserId = NdexClient.getUserId();
    }

    $scope.myAccount = ($scope.displayedUserId == NdexClient.getUserId);

    $scope.setAndDisplayCurrentNetwork = function (networkId) {
        sharedProperties.setCurrentNetworkId(networkId);
        $location.path("/networkQuery");
    }

    $scope.networkSearchResults = null;

    // Requests:
    //  Requests that mention the displayed user AND the signed-in user are displayed
    //  Requests to the signed-in user can be accepted or declined.

/*
    acceptRequest: function(event)
    {
        var acceptedRequest = event.data;
        acceptedRequest.response = $(this).val();
        acceptedRequest.responseMessage = $("#divModalContent textarea").val();
        acceptedRequest.responder = NdexWeb.ViewModel.User().id();

        NdexWeb.post("/requests",
            ko.mapping.toJS(acceptedRequest),
            function ()
            {
                NdexWeb.hideModal();
            });
    },

 declineRequest: function(event)
 {
 var declinedRequest = event.data;
 declinedRequest.response = "DECLINED";
 declinedRequest.responseMessage = $("#divModalContent textarea").val();
 declinedRequest.responder = NdexWeb.ViewModel.User().id();

 NdexWeb.post("/requests",
 ko.mapping.toJS(declinedRequest),
 function ()
 {
 NdexWeb.hideModal();
 });
 },
    canRespond: function(userRequest)
    {
        if (userRequest.toId() == User.ViewModel.User().id())
            return true;

        for (var groupIndex = 0; groupIndex < User.ViewModel.User().groups().length; groupIndex++)
        {
            if (userRequest.toId() != User.ViewModel.User().groups()[groupIndex].resourceId())
                continue;

            return true;
        }

        for (var networkIndex = 0; networkIndex < User.ViewModel.User().networks().length; networkIndex++)
        {
            if (userRequest.toId() != User.ViewModel.User().networks()[networkIndex].resourceId())
                continue;

            return true;
        }

        return false;
    },

    //
    inviteToGroup: function()
    {
        NdexWeb.showRequestModal("Group Invitation");
    },


    requestGroupAccess: function()
    {
        NdexWeb.showRequestModal("Join Group", this);
    },

    requestNetworkAccess: function()
    {
        NdexWeb.showRequestModal("Network Access", this);
    },

    showRequest: function(userRequest)
    {
        NdexWeb.showModal("Request", "#userRequest", true, function()
        {
            $("#divModalContent #spanFrom").text(userRequest.from());
            $("#divModalContent #spanTo").text(userRequest.to());
            $("#divModalContent p").text(userRequest.message());

            if (userRequest.response())
            {
                $("#divModalContent strong").removeClass("hide");
                $("#divModalContent strong > em").text(userRequest.response());
                $("#divModalContent strong > span").text(userRequest.responder());

                //Now that the user has viewed one of their requests that was
                //responded to, delete the request
                if (userRequest.toId() === NdexWeb.ViewModel.User.id())
                {
                    $("#btnCloseModal").click(function()
                    {
                        NdexWeb.delete("/requests/" + userRequest.id());
                        NdexWeb.hideModal();
                    });
                }
            }
            else if (User.canRespond(userRequest))
            {
                $("#divModalContent button").removeClass("hide");
                $("#divModalContent #btnDecline").click(userRequest, User.declineRequest);
                $("#divModalContent #ddlAccept").change(userRequest, User.acceptRequest);
            }
        });
    },
 */

    // Password change:
    // if the displayed user is the signed-in user, then the user can
    // request a password change using the change password dialog
/*


    changePassword: function()
    {
        NdexWeb.showModal("Change Password", "#changePassword", true, function()
        {
            $("#txtPassword").Password(
                {
                    Confirmation:
                    {
                        IsInvalidCallback: function()
                        {
                            $("#divModalContent button").attr("disabled", true);
                        },
                        IsValidCallback: function()
                        {
                            $("#divModalContent button").removeAttr("disabled");
                        },
                        MatchUrl: "/img/success.png",
                        MismatchUrl: "/img/alert.png",
                        TextBox: "#txtConfirmPassword"
                    }
                });

            $("#divModalContent button").click(function()
            {
                NdexWeb.post("/users/password",
                    $("#txtPassword").val(),
                    function()
                    {
                        localStorage.Password = $("#txtPassword").val();
                        $.gritter.add({ title: "Password Changed", text: "Your password has been changed." });
                        NdexWeb.hideModal();
                    });
            });
        });
    },
 */
    // Profile image:
    // if the displayed user is the signed-in user, then the user can
    // upload a new profile image
/*
    changeProfileImage: function(viewModel, event)
    {
        var imageType;
        if ($(event.target).text() === "Change Profile Image")
            imageType = "profile";
        else
            imageType = "background";

        NdexWeb.showModal("Change Profile Image", "#changeImage", true, function()
        {
            $("#frmChangeImage").attr("action", NdexWeb.ApiHost + "/users/image/" + imageType);
            $("#fileUpload").change(function()
            {
                $("#hidFilename").val($(this).val());
                $("#frmChangeImage").ajaxSubmit(
                    {
                        dataType: "json",
                        beforeSend: function(xhr)
                        {
                            xhr.setRequestHeader("Authorization", "Basic " + NdexWeb.ViewModel.EncodedUser());
                        },
                        success: function()
                        {
                            if (imageType === "profile")
                                $("#imgProfile").attr("src", "/profile/foreground/" + NdexWeb.ViewModel.User().username() + ".jpg?" + parseInt(Math.random() * 1000000));
                            else
                                $("#imgProfileBackground").attr("src", "/profile/background/" + NdexWeb.ViewModel.User().username() + ".jpg?" + parseInt(Math.random() * 1000000));

                            NdexWeb.hideModal();
                        },
                        error: function(jqXHR, textStatus, errorThrown)
                        {
                            $.gritter.add({ title: "Failure", text: "Failed to change your profile image." });
                        }
                    });
            });
        });
    },
*/
    // Create Group
    // If the displayed user is the signed-in user,
    // the user can invoke a dialog to create a group
    // the user will be an admin for the group
/*
    createGroup: function()
    {
        NdexWeb.showModal("Create Group", "#createGroup", true, function()
        {
            $("#frmCreateGroup").submit(function(event)
            {
                event.preventDefault();

                NdexWeb.put("/groups/",
                    {
                        accountType: "Group",
                        name: $("#txtGroupName").val()
                    },
                    function(newGroup)
                    {
                        window.location = "/group/" + newGroup.id;
                    },
                    function(jqXHR, textStatus, errorThrown)
                    {
                        $.gritter.add({ title: "Failure", text: "Failed to create the group." });
                    });
            });
        });
    },
*/
    // Upload Network
    // If the displayed user is the signed-in user,
    // the user can invoke a dialog to upload a network
    // and queue it for processing by the background task runner.
    // the user will be an admin for the network when it is created
/*
    createNetwork: function()
    {
        NdexWeb.showModal("Create Network", "#createNetwork", true, function()
        {
            $("#frmCreateNetwork").attr("action", NdexWeb.ApiHost + "/networks/upload");
            $("#fileUpload").change(function()
            {
                $("#hidFilename").val($(this).val());
                $("#frmCreateNetwork").ajaxSubmit(
                    {
                        dataType: "json",
                        beforeSend: function(xhr)
                        {
                            xhr.setRequestHeader("Authorization", "Basic " + NdexWeb.ViewModel.EncodedUser());
                        },
                        success: function()
                        {
                            $.gritter.add({ title: "Success", text: "The network has been uploaded and is currently in process." });
                            NdexWeb.hideModal(true);
                        },
                        error: function(jqXHR, textStatus, errorThrown)
                        {
                            //TODO: Need to add errors to the unordered list, but need to see how they're returned first
                            //$("#divErrors").show();
                            $.gritter.add({ title: "Failure", text: "Failed to create the network." });
                        }
                    });
            });
        });
    },
*/


    // update the users editable properties
    $scope.updateUser = function()
    {
        var updateConfig = NdexClient.getUserUpdateConfig($scope.displayedUser);
        $http(updateConfig)
            .success(function (user) {
                $scope.displayedUser = user;

            });
    };

    // The first pass at this controller will not attempt to cache user information
    // and will instead fetch the information each time the controller is invoked


    // In the beta API, the getUser method fetches all networks, requests, and tasks
    // first pass will use the beta API
    // In the NDEx 1.0 API, networks, requests, and tasks will be fetched page-wise in separate,
    // async operations and this controller will be updated to uses those operations.

    var config = NdexClient.getUserQueryConfig($scope.displayedUserId);
    $http(config)
        .success(function (user) {
            console.log("Set displayedUser");
            $scope.displayedUser = user;
            cUser = user;
        });

    // Hack to get some networks to display
    $scope.searchString = "apoptosis";
    $scope.searchType = "contains";
    $scope.submitNetworkSearch = function () {
        var config = NdexClient.getNetworkSearchConfig($scope.searchType, $scope.searchString);
        console.log("network search config = " + config);
        $http(config)
            .success(function (networks) {
                $scope.networkSearchResults = networks;
                console.log("Set networkSearchResults");
                console.log("first network name = " + networks[0].name);
                $scope.message = "first network name = " + networks[0].name;
            });
    }
    $scope.submitNetworkSearch();

});
