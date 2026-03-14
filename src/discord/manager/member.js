// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class MemberMenager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, connection_manager, guild_manager, api_manager } = manager;

    this.manager = manager;
    this.connection_manager = connection_manager;
    this.guild_manager = guild_manager;
    this.api_manager = api_manager;
    this.logger = logger;
  }

  quickBan(guild_id, user_id, opts = {}) {
    const { reason, delete_messages } = opts;
    return this.muteAndDeafMember(guild_id, user_id, reason).then(() => {
      return asyncDelay(2**11).then(() => {
        return this.timeoutMember(guild_id, user_id, reason).then(() => {
          return asyncDelay(2**11).then(() => {
            return this.banMember(guild_id, user_id, reason, delete_messages);
          });
        });
      });
    });
  }

  muteMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      mute: true
    }, headers);
  }

  unmuteMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      mute: false
    }, headers);
  }

  deafMemeber(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      deaf: true
    }, headers);
  }

  undeafMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      deaf: false
    }, headers);
  }

  muteAndDeafMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      mute: true,
      deaf: true
    }, headers);
  }

  unmuteAndUndeafMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.patch(format('/guilds/%s/members/%s', guild_id, user_id), {
      mute: false,
      deaf: false
    }, headers);
  }

  timeoutMember(guild_id, user_id, reason, until_date) {
    until_date = new Date((new Date()).setHours((new Date()).getHours()+1+24*28));

    const headers = {};

    if (reason)
      headers['X-Audit-Log-Reason'] = reason;

    const url = format('/guilds/%s/members/%s', guild_id, user_id);
    const body = {
      communication_disabled_until: until_date
    };
    return this.api_manager.patch(url, body, headers);
  }
  
  removeMemberTimeout(guild_id, user_id, reason) {
    const headers = {};

    if (reason)
      headers['X-Audit-Log-Reason'] = reason;

    const url = format('/guilds/%s/members/%s', guild_id, user_id);
    const body = {
      communication_disabled_until: null
    };
    return this.api_manager.patch(url, body, headers);
  }

  banMember(guild_id, user_id, reason, delete_messages = false) {
    const headers = {};

    if (reason)
      headers['X-Audit-Log-Reason'] = reason;

    const url = format('/guilds/%s/bans/%s', guild_id, user_id);
    const body = {
      delete_message_seconds: delete_messages ? 604800 : 0
    };
    return this.api_manager.put(url, body, headers);
  }

  unbanMember(guild_id, user_id, reason) {
    const headers = {};

    if (reason)
      headers['X-Audit-Log-Reason'] = reason;

    const url = format('/guilds/%s/bans/%s', guild_id, user_id);
    return this.api_manager.delete(format('/guilds/%s/bans/%s', guild_id, user_id), void 0, headers);
  }

  kickMember(guild_id, user_id, reason) {
    const headers = {};
    if (reason)
      headers['X-Audit-Log-Reason'] = reason;
    return this.api_manager.delete(format('/guilds/%s/members/%s?reason=', guild_id, user_id), void 0, headers);
  }
}

module.exports = MemberMenager;