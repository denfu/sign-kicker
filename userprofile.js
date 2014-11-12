Invitations = new Mongo.Collection("Invitations");

if (Meteor.isClient) {

	Meteor.subscribe('allInvitations');

	var generateInviteId = function() {
		//return location.host + "/invitation/" + 
		return getUUID().split("-").join("");
	}

    Template.profile_body.helpers({
        getInvitations : function() {
            return Invitations.find({ownerId:Meteor.userId()});
        }

        
    });

	Template.invitationTableRow.helpers({
		getInviteUrl : function() {
        	return location.host + "/invitation/" + this.url;
        }
	});

	Template.profile_dialog.events({
		'click .y-generate-invite-link' : function() {
            var invite = {
                ownerId: Meteor.userId(),
                url : generateInviteId(),
                inUse : false,
                creationDate : new Date().getTime()
            }

            Invitations.insert(invite, function(err, matchInserted){
                if (err) {
                    //TODO: log fail
                }
            });
        
        },

        'click .y-delete-invitation' : function() {
            
            Invitations.remove({_id:this._id});
        
        },

		'click a#y-logout-btn' : function() {
			Meteor.logout(function(){
				Session.set(Const.CHROM_SYNCED_ALREADY, false);
			});
		}
	});
}

if (Meteor.isServer) {

    Meteor.publish("allInvitations", function () {
      return Invitations.find({});
    });

}