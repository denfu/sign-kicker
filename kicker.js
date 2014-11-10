Config = new Mongo.Collection("Config");
Matches = new Mongo.Collection("Matches");



MatchState = {
    INITIALIZED : "initialized",
    STARTED     : "started",
    ABORTED     : "aborted",
    ENDED       : "ended"
}



MatchManager = {
    updateMatch: function(match) {
        Matches.update({_id:match._id}, match);
    },

    abortMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {aborter: Meteor.userId(), state : MatchState.ABORTED, abortDate: new Date().getTime()}});
    },

    startMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {aborter: Meteor.userId(), state : MatchState.STARTED, abortDate: new Date().getTime()}});
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
            endDate         : null,
            abortDate       : null,
            aborter         : null,
            state           : MatchState.INITIALIZED,
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
        var now = new Date().getTime() - (1000 * 60 * 1);
        return Matches.find(
            {$or : [{state : {$ne: MatchState.ABORTED}}, {abortDate: {$gt: now}} ]},
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
      passwordSignupFields: 'USERNAME_AND_EMAIL'
    });



    Template.statelabel.helpers({
        getStateLabelName : function() {
            console.log(this);
            return state;
        },
        getStateLabelCls : function() {
            return "success";
        }
    });

    Template.matchList.helpers({
        isStarted :     function() {
            return this.state === MatchState.STARTED;
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
            return "y-state-"+this.state;
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
            if (this.match.state === MatchState.ABORTED || this.match.state === MatchState.STARTED) {
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

  Template.masterTemplate.rendered = function()
  {
    if (!Meteor.userId()) {
        Accounts._loginButtonsSession.set('dropdownVisible', true);
    }
    

    //$('*[data-toggle="tooltip"]').tooltip();
  };

    

    Template.masterTemplate.helpers({
        
        getUserPath: function() {
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
    	}
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

            Meteor.users.update({_id: Meteor.userId()}, {$set:form});
            
            $('#modal-profile').modal('hide');

            

            //do validation on form={firstname:'first name', lastname: 'last name', email: 'email@email.com'}



        }
    });

 

  Template.matchList.events({
    'click .y-about-to-start-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
       
        MatchManager.startMatch(this._id);
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

        /*if (options.profile)
        user.profile = options.profile;*/
        return user;
    });



    Meteor.startup(function () {
    // code to run on server at startup

    });
}
