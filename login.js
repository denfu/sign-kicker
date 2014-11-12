if (Meteor.isClient) {

     var tryLogin = function(url) {
        Session.set("createUserValidationError", false);

        var username = $('#y-user-create').val().trim();
        var pw = $('#y-user-create-password').val().trim();

        if (!username || !pw || username.length < 5) {
            Session.set("createUserValidationError", true);
            return;
        }

        //var invitation = Invitations.findOne({url:url, inUse:false});
        //if (invitation) {
            //Matches.update({_id:id}, {$set: {state : MatchState.INITIALIZED}});
            //Invitations.update({_id:invitation._id}, {$set: {inUse:true}});
            Accounts.createUser({username: username, password: pw, url:url}, function(err) {
                if (err) {
                    Session.set("creationError", err.message);
                } else {
                    Router.go("/");
                }
            });
        /*} else {
            Session.set("urlInvalid", true);
        }*/
         
    }

    Template.registration.helpers({
        invitation : function() {
            return Invitations.findOne({url: this.url});
        },
        forwardIfLoggedIn : function() {
            if (Meteor.userId()) {
                Router.go("/");
            }
        }
    });

    Template.registrationForm.helpers({
        validationFailed : function() {
            return Session.get("createUserValidationError");
        },

        urlInvalid : function() {
            return Session.get('urlInvalid');
        },

        creationError : function() {
            return Session.get('creationError');
        }
    });


    Template.registrationForm.events({
        'click #y-user-create-btn' :function() {
            tryLogin(this.url);
            
        }
    });


    Template.registrationForm.rendered = function() {
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

        var username = $('#y-user-create');
        var pw = $('#y-user-create-password');
       
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
       

        pw.pressEnter(function(e, a){
            tryLogin();          
        });

        username.pressEnter(function(e, a){
            tryLogin();                     
        });
    };
}