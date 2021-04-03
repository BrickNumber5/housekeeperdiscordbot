const { token } = require( "./config.json" )

console.log("Started up Housekeeper")

const discordJs = require( "discord.js" )
const client = new discordJs.Client( )
const guildId = "827641404863676456"

const getApp = guildId => {
  const app = client.api.applications( client.user.id )
  if ( guildId ) app.guilds( guildId )
  return app
}

client.on( "ready", async ( ) => {
  console.log( `Up and running as ${ client.user.tag }` )
  
  const cmds = await getApp( guildId ).commands.get( )
  console.log( cmds )
  
  await getApp( guildId ).commands.post( {
    data: {
      name: "role",
      description: "Add or remove publicly available roles from yourself",
      options: [
        {
          name: "add",
          description: "Add a publicly available role to yourself",
          type: 1,
          options: [
            {
              name: "role",
              description: "The role to add",
              type: 8,
              required: true
            }
          ]
        },
        {
          name: "remove",
          description: "Remove a publicly available role from yourself",
          type: 1,
          options: [
            {
              name: "role",
              description: "The role to remove",
              type: 8,
              required: true
            }
          ]
        }
      ]
    }
  } )
  
  client.ws.on( "INTERACTION_CREATE", async interaction => {
    const cmdName = interaction.data.name.toLowerCase( )
    
    if ( cmdName === "role" ) {
      let guild = interaction.guild_id,
          user  = interaction.member.user.id,
          mode  = interaction.data.options[ 0 ].name,
          role  = interaction.data.options[ 0 ].options[ 0 ].value
      
      console.log( "[ HousekeeperBot ] Role Command" )
      let guildObj = await client.guilds.fetch( guild ),
          userObj  = await guildObj.members.fetch( user ),
          roleObj  = await guildObj.roles.fetch( role )
      console.log( `${userObj.user.username} used /role ${mode} in ${guildObj.name} with role @${ roleObj.name }` )
      if ( mode === "add" ) {
        userObj.roles.add( roleObj )
        reply( interaction, `Gave you ${roleObj}` )
      } else if ( mode === "remove" ) {
        userObj.roles.remove( roleObj )
        reply( interaction, `Removed ${roleObj} from you` )
      }
    }
  } )
} )

const reply = ( interaction, message ) => {
  client.api.interactions( interaction.id, interaction.token ).callback.post( {
    data: {
      type: 4,
        data: {
          content: message.toString( )
        }
      }
  } )
}

client.on( "message", message => {
  //console.log( message )
} )

client.login( token )