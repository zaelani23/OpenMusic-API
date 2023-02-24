const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(playlistsService, songsService, validator, playlistActivitiesService) {
    this._playlistsService = playlistsService;
    this._songsService = songsService;
    this._validator = validator;
    this._playlistActivitiesService = playlistActivitiesService;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._playlistsService.addPlaylist(name, credentialId);

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._playlistsService.getPlaylists(credentialId);
    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(id, credentialId);
    await this._playlistsService.deletePlaylistById(id);
    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postSongByPlaylistIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { songId } = request.payload;

    this._validator.validatePostSongIdPayload(request.payload);

    await this._songsService.getSongById(songId);
    await this._playlistsService.verifyPlaylistAccess(id, credentialId);
    await this._playlistsService.addSongByPlaylistId(id, songId);
    await this._playlistActivitiesService.addPlaylistActivities(id, credentialId, songId, 'add');

    const response = h.response({
      status: 'success',
      message: 'Song berhasil ditambahkan ke playlist',
    });
    response.code(201);
    return response;
  }

  async getSongByPlaylistIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistExist(id);
    await this._playlistsService.verifyPlaylistAccess(id, credentialId);

    const result = await this._playlistsService.getSongsByPlaylistId(id);
    const songs = result.map((res) => ({
      id: res.song_id,
      title: res.title,
      performer: res.performer,
    }));
    const playlist = {
      id: result[0].playlist_id,
      name: result[0].name,
      username: result[0].username,
    };

    return {
      status: 'success',
      data: {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          username: playlist.username,
          songs,
        },
      },
    };
  }

  async deleteSongFromPlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { songId } = request.payload;

    this._validator.validatePostSongIdPayload(request.payload);

    await this._playlistsService.verifyPlaylistAccess(id, credentialId);
    await this._playlistsService.deleteSongFromPlaylistById(songId, id);
    await this._playlistActivitiesService.addPlaylistActivities(id, credentialId, songId, 'delete');

    return {
      status: 'success',
      message: 'Song berhasil dihapus dari playlist',
    };
  }

  async getPlaylistActivitiesHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistExist(id);
    await this._playlistsService.verifyPlaylistAccess(id, credentialId);

    const result = await this._playlistActivitiesService.getPlaylistActivities(id);

    const playlistId = result[0].playlist_id;
    const activities = result.map((activity) => ({
      username: activity.username,
      title: activity.title,
      action: activity.action,
      time: activity.time,
    }));

    return {
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    };
  }
}

module.exports = PlaylistsHandler;
