Config = new Mongo.Collection("Config");
Matches = new Mongo.Collection("Matches");



MatchState = {
    INITIALIZED : "initialized",
    STARTED     : "started",
    ABORTED     : "aborted",
    ENDED       : "ended"
}



MatchManager = {
    
    endMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {ender: Meteor.userId(), state : MatchState.ENDED, endDate: new Date().getTime()}});
    },
    updateMatch: function(match) {
        Matches.update({_id:match._id}, match);
    },

    abortMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {aborter: Meteor.userId(), state : MatchState.ABORTED, abortDate: new Date().getTime()}});
    },

    startMatch: function(id) {
       //Matches.remove({_id:id});
        sendMessage(MSG_IDS.GAME_START, id)
        Matches.update({_id:id}, {$set: {starter: Meteor.userId(), state : MatchState.STARTED, startDate: new Date().getTime()}});
    },

    undoAbortMatch: function(id) {
       
        Matches.update({_id:id}, {$set: {state : MatchState.INITIALIZED}});
    },

    createMatch: function() {
        var biggestNum = Matches.findOne({},{sort:{num:-1}});
        var match = {
            creator         : Meteor.userId(),
            creationDate    : new Date().getTime(),
            startDate       : null,
            starter         : null,
            endDate         : null,
            abortDate       : null,
            aborter         : null,
            ender           : null,
            state           : MatchState.INITIALIZED,
            placesReservedBy: [null, null, null, null],    
            places          : [null, null, null, null],
            num             : biggestNum? biggestNum.num + 1 : 1
        }

        Matches.insert(match, function(err, matchInserted){
            if (err) {
                //TODO: log fail
            }
        });
        return match;
    },

    getMatches: function() {
        var timeThreshhold = new Date().getTime() - (1000 * 60 * 1);
        return Matches.find(
            {
                $and: [{
                    $or : [
                        {state : {$ne: MatchState.ABORTED}}, 
                        {abortDate: {$gt: timeThreshhold}}
                        ]
                }, {
                    $or : [
                        {state : {$ne: MatchState.ENDED}}, 
                        {endDate: {$gt: timeThreshhold}}
                        ]
                }]                
            },
            {sort: { creationDate: -1 }}
        ).fetch(); //TODO: no ended 
    },

    getMatchById: function(id) {
        return Matches.findOne({_id:id});
    }
};

var sendMessage = function(msgId, msgObject, cb) {
    
    chrome.runtime.sendMessage(Const.APP_ID, {msgId: msgId, msgObject: msgObject}, function(response) {
        //TODO: cb
    });
}


if (Meteor.isClient) {
    Meteor.subscribe('allUsers');
    Meteor.subscribe('allMatches');
    Meteor.subscribe('allChats');

    Accounts.ui.config({      
      passwordSignupFields: 'USERNAME_ONLY'
    });



    Template.statelabel.helpers({
        getStateLabelName : function() {            
            return this.toString();
        },
        getStateLabelCls : function() {
            switch (this.toString()) {
                case MatchState.STARTED:
                    return "success";
                case MatchState.ABORTED:
                    return "danger";
                case MatchState.INITIALIZED:
                    return "default";
                case MatchState.ENDED:
                    return "primary";
            }
        }
    });

    Template.matchList.helpers({
        isStarted :     function() {
            return this.state === MatchState.STARTED;
        },

        isEnded :     function() {
            return this.state === MatchState.ENDED;
        },

        isMatchAboutToStart : function() {
            if (MatchState.ABORTED === this.state || this.state === MatchState.STARTED) {
                return false;
            }

            var foundEmpty = false;
            $.each(this.places, function(index, value) {
                if (value === null) {
                    foundEmpty = true;
                    return;
                }
            });

            return !foundEmpty;
        },

        isMatchAbortedOrStarted : function() {
            return MatchState.ABORTED === this.state || this.state === MatchState.STARTED;           
        },

        getMatches: function() {
            return MatchManager.getMatches();
        },

        isMatchAborted: function() {
            return MatchState.ABORTED === this.state;
        },

        getStateClass: function() {
            return "";//"y-state-"+this.state;
        }
    });

    Template.switch.helpers({
        getName: function(match, i) {
            var userId = match.places[i];
            if (!userId) {
                return I18N.openPlace;
            } else if (userId === Const.UNKNOWN_USER) {
                return I18N.unknownPlace;
            } 

            var user = Meteor.users.findOne({_id: userId});
            if (!user) {                    
                return I18N.unknownPlace;
            }

            if (userId === Meteor.userId()) {
                return I18N.you;
            }
            
            return user.profile? user.profile.username : user.username;//emails[0].address.substr(0, 5);
        }
    });

    Template.placeButton.helpers({
       
       disableoverlay: function() {
            if (this.match.state === MatchState.ABORTED || this.match.state === MatchState.STARTED || this.match.state === MatchState.ENDED) {
                return "y-disable-overlay";
            }
       },
       
       //unused
        getPlace: function(places, index) {
            return places[index] === null? "Leer" : places[index];
        },

        isUnset: function(places, index) {
            return !places[index];
        },

        isThisUser: function(places, index) {
            return Meteor.userId() === places[index];
        }
    });

  Template.actionbar.events({
    'click .y-create-match' :  function() {
        //MatchManager.createMatch(); 
        var newMatch = MatchManager.createMatch();
        var target = "#num-" + (newMatch.num-1);
        var targetTag = $(target);
        
        if (!target) {
            return ;
        }

        //targetTag[0].scrollIntoView();
        
    }
  });

  Template.masterTemplate.rendered = function() {
    if (!Meteor.userId()) {
        Accounts._loginButtonsSession.set('dropdownVisible', true);
    }
  };

    

    Template.masterTemplate.helpers({
        syncChromeWithAccount : function() {
            if (!Session.get(Const.CHROM_SYNCED_ALREADY)) {
                Session.set(Const.CHROM_SYNCED_ALREADY, true);
                sendMessage(MSG_IDS.PROFILE_CHANGE, Meteor.user().profile);
            }
        }
        /*getUserPath: function() {
            return location.pathname;
        },

    	getUserId: function() {
            var userId = Meteor.userId(); 
            if (userId && !Session.get("userId")) {
                Session.set("userId", userId);
                //sendMessage("userId", {userId: userId});
                //todo: callback
            }

            return userId;
    	}*/
  });

  
    Template.actionbar.events({
        'click .y-profile-btn' : function() {
           
            $('#modal-profile').modal();
        }
    });

    Template.profile_dialog.events({
        'click .save-profile-btn' : function() {
            
            var form = {profile:{}};

            $.each($('#profile-form input'), function(){
                switch(this.type) {
                    case 'text':
                        if (this.value) {
                            form.profile[this.id] = this.value;                            
                        }
                        break;
                    case 'checkbox':
                        form.profile[this.id] = this.checked;
                        break;
                    default:
                        break;
                }
                
            })

            var userprofile = $.extend(Meteor.user().profile, form.profile);
            form.profile = userprofile;
            Meteor.users.update({_id: Meteor.userId()}, {$set:form});
            
            $('#modal-profile').modal('hide');

            sendMessage(MSG_IDS.PROFILE_CHANGE, form);
            

            //do validation on form={firstname:'first name', lastname: 'last name', email: 'email@email.com'}



        }
    });

 

  Template.matchList.events({
    'click .y-about-to-start-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
       
        MatchManager.startMatch(this._id);
    }, 

    'click .y-ended-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
       
        MatchManager.endMatch(this._id);
    },




    'click .y-abort-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
        MatchManager.abortMatch(this._id);
    },

    'click .y-abort-undo-btn': function (e,a) {
        
        MatchManager.undoAbortMatch(this._id);
    },

    'click a.y-btn-place': function (e,a) {
        var matchId = $(e.currentTarget).parents(".list-group-item")[0].dataset.matchid;
        //var state = e.currentTarget.dataset.state;
        var index = e.currentTarget.dataset.index;
        var match = MatchManager.getMatchById(matchId);
        var place = match.places[index];
        var userId = Meteor.userId();
        var alreadSet = match.places.indexOf(userId) >= 0;
        
        if (!place && !alreadSet) {
            match.places[index] = Meteor.userId()
        } else if (!place) {
            match.places[index] = Const.UNKNOWN_USER;
        } 
        //else if (place === Meteor.userId()) {
        //    match.places[index] = null;
         else {
            match.places[index] = null;
        }
        MatchManager.updateMatch(match);
    } 
  });

    Template.myLoginButtons.helpers({
        validationFailed : function() {
            if(Session.get("createUserValidationError")){
                Session.set("createUserValidationError",false);
                return true;
            }
            return false;
        },

        usernotexists : function() {
            Session.get("userNotExists");
        }
    });


    Template.myLoginButtons.events({
        'click #y-user-create-btn' :function() {
            var username = $('#y-user-create-or-login');
            var nick = input.val();
            nick = nick.trim();

            console.log(nick);
        }
    });


    Template.myLoginButtons.rendered = function() {
        $.fn.pressEnter = function(fn) {  

            return this.each(function() {  
                $(this).bind('enterPress', fn);
                $(this).keyup(function(e){
                    if(e.keyCode == 13)
                    {
                      $(this).trigger("enterPress");
                    }
                })
            });  
        };

        var username = $('#y-user-create-or-login');
        var pw = $('#y-user-create-or-login-password');

        username.on('focusin', function(){
            this.placeholder = "";
        });

        pw.on('focusin', function(){
            this.placeholder = "";
        });


        username.on('focusout', function(){            
            this.placeholder = I18N.username;
        });

        pw.on('focusout', function(){            
            this.placeholder = I18N.password;
        });

        var tryLogin = function() {
            var username = $('#y-user-create-or-login').val().trim();
            var pw = $('#y-user-create-or-login-password').val().trim();

            //TODO: login  
        }

        pw.pressEnter(function(e, a){
            tryLogin();          
        });

        username.pressEnter(function(e, a){
            var input = $(e.currentTarget);
            var nick = input.val();
            if (!nick || !nick.trim() || !nick.trim().length > 5) {
                Session.set("createUserValidationError", true);
            }

            nick = nick.trim();
            
            var user = Meteor.users.findOne({username:nick});
            
            if (!user) {
                Session.set("userNotExists, true");
            }

            
            //TODO: login            
        });
    };

}


if (Meteor.isServer) {
    //Meteor.users.allow({update: function () { return true; }});

    Meteor.publish("allUsers", function () {
      return Meteor.users.find({});
    });

    Meteor.publish("allMatches", function () {
      return Matches.find({});
    }); 

    Meteor.publish("allChats", function () {
      return Chats.find({});
    });

    Accounts.onCreateUser(function(options, user) {
        user.profile = {
            notifyOnStart : true,
            notifyOnMsg : false,
            notifyAdd : false,
            notifyOnFull : true,
            username : user.username
        }

        Session.set("profileIsSet", true);

        

        /*if (options.profile)
        user.profile = options.profile;*/
        return user;
    });



    Meteor.startup(function () {
    // code to run on server at startup

    });
}
