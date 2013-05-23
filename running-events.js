var serverselect = document.getElementById('servers');
var regionselect = document.getElementById('region');
var mapselect = document.getElementById('map');
var eventslist = document.getElementById('events');
var eventsbutton = document.getElementById('getevents');

var globalstore = {};
var store = {};
var storeid = 'gw2-running-events';

var lang = 'fr';

if (localStorage[storeid] === undefined) {
	localStorage[storeid] = JSON.stringify(globalstore);
} else {
	globalstore = JSON.parse(localStorage[storeid]);
}

if (globalstore[lang] === undefined) {
	globalstore[lang] = store;
} else {
	store = globalstore[lang];
}

var cachelength = 1000 * 60 * 60 * 24; // 24 hours
var now = new Date().getTime();

var local = {
	servers : [],
	regions : [],
	maps : [],
	events : [],
	eventsstatus : []
};

var index = {
	servers : {},
	regions : {},
	maps : {},
	events : {}
}

var loaded = {
	servers : false,
	regions : false,
	maps : false,
	events : false
}

function loaddata(storage, uri) {
	if (store[storage] && store[storage + 'age'] - now < cachelength) {
		local[storage] = store[storage];
		loadindex(storage);
		loaded[storage] = true;
	} else {
		ajax.getJSON(uri, function (data) {
			store[storage] = data;
			store[storage + 'age'] = now;
			localStorage[storeid] = JSON.stringify(globalstore);
			local[storage] = store[storage];
			loadindex(storage);
			loaded[storage] = true;
			loadform();
		});
	}
}

function loadindex(storage) {
	local[storage].forEach(function (item) {
		index[storage][item.id] = item.name;
	})
}

function loadform() {
	var ready = true;

	for (var i in loaded) {
		ready = ready && loaded[i];
	}

	if (ready) {
		refreshservers();
		refreshregions();
		refreshmaps();
		bind();
	}
}

function initselect(select, message) {
	var option;
	select.innerHTML = '';

	option = document.createElement('option');
	option.value = -1;
	option.innerText = message;
	select.appendChild(option);

	option = document.createElement('option');
	option.value = -1;
	option.innerText = '';
	select.appendChild(option);
}

function refreshservers() {
	var servers = local.servers;

	initselect(serverselect, 'Select a server');

	servers.forEach(function (server) {
		option = document.createElement('option');
		option.value = server.id;
		option.innerText = server.name;
		serverselect.appendChild(option);
	});
}

function refreshregions() {
	var regions = local.regions;

	initselect(regionselect, 'Select a region');

	regions.forEach(function (region) {
		var option = document.createElement('option');
		option.value = region.id;
		option.innerText = region.name;
		regionselect.appendChild(option);
	});
}

function refreshmaps(region) {
	var maps = local.maps;

	initselect(mapselect, 'Select a map');

	if (region !== undefined) {
		local.regions.some(function (r) {
			if (region === r.id) {
				region = r.maps;
				return true;
			}
		});

		if (region) {
			var allmaps = maps;
			maps = [];

			region.forEach(function (mapid) {
				allmaps.some(function (map) {
					if (mapid === map.id) {
						maps.push(map);
						return true;
					}
				});
			});
		}
	}

	maps.forEach(function (map) {
		var option = document.createElement('option');
		option.value = map.id;
		option.innerText = map.name;
		mapselect.appendChild(option);
	});
}

function refreshevents() {
	var worlds = [];
	var done = {
		worlds : {},
		maps : {}
	}
	var mapsloaded = {}

	if (regionselect.value !== '-1') {
		var region = regionselect.value;
		local.regions.some(function (r) {
			if (region === r.id) {
				region = r.maps;
				return true;
			}
		});

		if (region) {
			region.forEach(function (mapid) {
				mapsloaded[mapid] = true;
			});
		}
	} else if (mapselect.value !== '-1') {
		mapsloaded[mapselect.value] = true;
	} else {
		local.maps.forEach(function (map) {
			mapsloaded[map.id] = true;
		});
	}

	console.log(mapsloaded)

	local.eventsstatus.forEach(function (event) {
		var wid;
		var mid;
		var maps;
		var events;

		if (done.worlds[event.world_id] === undefined) {
			done.worlds[event.world_id] = worlds.length;
			done.maps = {};
			worlds.push({
				world_id : event.world_id,
				maps : []
			})
		}
		wid = done.worlds[event.world_id];
		maps = worlds[wid].maps;

		console.log(event.map_id + ' - ' + mapsloaded[event.map_id])

		if (mapsloaded[event.map_id]) {
			if (done.maps[event.map_id] === undefined) {
				done.maps[event.map_id] = maps.length;
				maps.push({
					map_id : event.map_id,
					events : []
				})
			}
			mid = done.maps[event.map_id];
			events = maps[mid].events;

			events.push({
				event_id : event.event_id,
				state : event.state
			});
		}
	});

	eventslist.innerHTML = '';

	worlds.forEach(function (world) {
		var name = document.createElement('h2');
		name.innerText = index.servers[world.world_id];
		eventslist.appendChild(name);

		world.maps.forEach(function (map) {
			name = document.createElement('h3');
			name.innerText = index.maps[map.map_id];
			eventslist.appendChild(name);

			var list = document.createElement('ul');
			eventslist.appendChild(list);

			map.events.forEach(function (event) {
				if (event.state !== "Warmup") {
					var item = document.createElement('li');
					item.innerText = index.events[event.event_id];
					item.className = event.state
					list.appendChild(item);
				}
			});
		});
	});
}

function bind() {
	regionselect.addEventListener('change', selectregion);
	eventsbutton.addEventListener('click', getevents);
}

function selectregion() {
	var regionid = regionselect.value;

	if (regionid === "-1") {
		regionid = undefined;
	}

	refreshmaps(regionid);
}

function getevents() {
	var uri = 'https://api.guildwars2.com/v1/events.json';

	if (serverselect.value !== "-1") {
		if (uri.indexOf('?') === -1) uri += '?';
		else uri += '&';

		uri += 'world_id=' + serverselect.value;
	}

	if (mapselect.value !== "-1") {
		if (uri.indexOf('?') === -1) uri += '?';
		else uri += '&';

		uri += 'map_id=' + mapselect.value;
	}

	ajax.getJSON(uri, function (data) {
		local.eventsstatus = data.events;
		refreshevents();
	});
}

loaddata('servers', 'https://api.guildwars2.com/v1/world_names.json?lang=' + lang);
loaddata('regions', 'http://gw2.maxgun.fr/api/' + lang + '/region_names.json');
loaddata('maps', 'https://api.guildwars2.com/v1/map_names.json?lang=' + lang);
loaddata('events', 'https://api.guildwars2.com/v1/event_names.json?lang=' + lang);
loadform();