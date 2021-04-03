const fs = require( "fs" )
const { token } = require( "./config.json" )

console.log("Started up Housekeeper")

const discordJs = require( "discord.js" )
const client = new discordJs.Client( )
const guildId = "827641404863676456"

const guildData = new Map( )

const getApp = guildId => {
  const app = client.api.applications( client.user.id )
  if ( guildId ) app.guilds( guildId )
  return app
}

const setupfs = ( ) => {
  return new Promise( async ( resolve, reject ) => {
    let guilds = client.guilds.cache.map( guild => guild.id )
    for ( let i = 0; i < guilds.length; i++ ) {
      await new Promise( ( res, rej ) => fs.mkdir( `./data/${ guilds[ i ] }`, { }, res ) )
      fs.writeFile( `./data/${ guilds[ i ] }/publicroles.csv`, "", { flag: "wx" }, ( ) => { } )
      guildData.set( guilds[ i ], {
        publicroles: new Set( fs.readFileSync( `./data/${ guilds[ i ] }/publicroles.csv` ).toString( ).split( "," ) )
      } )
      guildData.get( guilds[ i ] ).publicroles.delete( "" )
    }
    resolve( )
  } )
}

const writepublicroles = ( guildId ) => {
  return new Promise( ( resolve, reject ) => {
    fs.writeFile( `./data/${ guildId }/publicroles.csv`, Array.from( guildData.get( guildId ).publicroles ).join( "," ), resolve )
  } )
}

client.on( "ready", async ( ) => {
  console.log( `Up and running as ${ client.user.tag }` )
  
  const cmds = await getApp( guildId ).commands.get( )
  
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
        },
        {
          name: "config",
          description: "Set which roles are considered publicly availabe ( Admin Only )",
          type: 2,
          options: [
            {
              name: "add",
              description: "Set a role as publicly availabe ( Admin only )",
              type: 1,
              options: [
                {
                  name: "role",
                  description: "The role to make publicly available",
                  type: 8,
                  required: true
                }
              ]
            },
            {
              name: "remove",
              description: "Set a role as not publicly availabe ( Admin only )",
              type: 1,
              options: [
                {
                  name: "role",
                  description: "The role to make not publicly available",
                  type: 8,
                  required: true
                }
              ]
            },
            {
              name: "list",
              description: "List the publicly available roles",
              type: 1
            },
            {
              name: "clear",
              description: "Clear the list of publicly available roles ( Admin only )",
              type: 1
            }
          ]
        }
      ]
    }
  } )
  
  await setupfs( )
  
  client.ws.on( "INTERACTION_CREATE", async interaction => {
    const cmdName = interaction.data.name.toLowerCase( )
    
    if ( cmdName === "role" ) {
      let guild = interaction.guild_id,
          user  = interaction.member.user.id,
          mode  = interaction.data.options[ 0 ].name,
          role
      if ( mode === "config" ) {
        mode += " " + interaction.data.options[ 0 ].options[ 0 ].name
        if ( mode !== "config list" && mode !== "config clear" ) {
          role = interaction.data.options[ 0 ].options[ 0 ].options[ 0 ].value
        }
      } else {
        role  = interaction.data.options[ 0 ].options[ 0 ].value
      }
      let guildObj = await client.guilds.fetch( guild ),
          userObj  = await guildObj.members.fetch( user ),
          roleObj  = role ? await guildObj.roles.fetch( role ) : { },
          isAdmin  = isUserAdmin( userObj )
      //console.log( isAdmin )
      switch ( mode ) {
      case "add":
        if ( guildData.get( guild ).publicroles.has( role ) ) {
          userObj.roles.add( roleObj )
          reply( interaction, `Gave you ${ roleObj }` )
        } else {
          reply( interaction, `ERR: ${ roleObj } is not a publicly available role` )
        }
        break
      case "remove":
        if ( guildData.get( guild ).publicroles.has( role ) ) {
          userObj.roles.remove( roleObj )
          reply( interaction, `Removed ${ roleObj } from you` )
        } else {
          reply( interaction, `ERR: ${ roleObj } is not a publicly available role` )
        }
        break
      case "config list":
        let publicroleslist = mkfancylist( Array.from( guildData.get( guild ).publicroles ).map( x => guildObj.roles.cache.get( x ) ) )
        reply( interaction, publicroleslist ? "The publicly available roles are: " + publicroleslist : "There are no publicly available roles" )
        break
      case "config add":
        if ( !isAdmin ) {
          reply( interaction, "ERR: You are not an administrator" )
        } else {
          guildData.get( guild ).publicroles.add( role )
          await writepublicroles( guildId )
          reply( interaction, `Added ${ roleObj } to the list of publicly available roles` )
        }
        break
      case "config remove":
        if ( !isAdmin ) {
          reply( interaction, "ERR: You are not an administrator" )
        } else {
          guildData.get( guild ).publicroles.delete( role )
          await writepublicroles( guildId )
          reply( interaction, `Removed ${ roleObj } from the list of publicly available roles` )
        }
        break
      case "config clear":
        if ( !isAdmin ) {
          reply( interaction, "ERR: You are not an administrator" )
        } else {
          guildData.get( guild ).publicroles.clear( )
          await writepublicroles( guildId )
          reply( interaction, "Cleared the list of public roles" )
        }
        break
      }
    }
  } )
} )

const reply = ( interaction, message ) => {
  client.api.interactions( interaction.id, interaction.token ).callback.post( {
    data: {
      type: 4,
        data: {
          content: message.toString( ),
          flags: 64
        }
      }
  } )
}

client.on( "message", message => {
  //console.log( message )
} )

const mkfancylist = arr => {
  if ( arr.length === 0 ) return ""
  arr = arr.map( x => x.toString( ) )
  if ( arr.length === 1 ) return arr[ 0 ]
  if ( arr.length === 2 ) return `${ arr[ 0 ] } and ${ arr[ 1 ] }`
  let last = arr.pop( )
  return arr.join( ", " ) + ", and " + last
}

const isUserAdmin = guildMember => guildMember.hasPermission( 8 )

client.login( token )
