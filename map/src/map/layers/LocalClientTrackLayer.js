import React, {useContext, useEffect, useState} from "react";
import AppContext from "../../context/AppContext";
import {useMap} from "react-leaflet";
import L from "leaflet";
import TrackLayerProvider from "../TrackLayerProvider";
import TracksManager from "../../context/TracksManager";
import MarkerOptions from "../markers/MarkerOptions";
import _ from "lodash";
import EditablePolyline from "../EditablePolyline";
import EditableMarker from "../EditableMarker";


export default function LocalClientTrackLayer() {
    const ctx = useContext(AppContext);
    const map = useMap();

    const [layers, setLayers] = useState({});
    const [selectedPointMarker, setSelectedPointMarker] = useState(null);

    function addTrackToMap(track, fitBounds, active) {
        let layer = TrackLayerProvider.createLayersByTrackData(track);
        if (fitBounds) {
            map.fitBounds(layer.getBounds());
        }
        layer.addTo(map);
        layers[track.name] = {layer: layer, points: TracksManager.getEditablePoints(track), active: active};
    }

    function createPointMarkerOnMap() {
        return new L.marker({
            lng: ctx.selectedGpxFile.showPoint.lng,
            lat: ctx.selectedGpxFile.showPoint.lat
        }, {
            icon: MarkerOptions.options.pointerIcons
        }).addTo(map);
    }

    function showSelectedTrackOnMap() {
        let currLayer = layers[ctx.selectedGpxFile.name];
        if (currLayer) {
            map.fitBounds(currLayer.layer.getBounds());
        }
    }

    function showSelectedPointOnMap() {
        if (selectedPointMarker) {
            map.removeLayer(selectedPointMarker.marker);
        }
        let marker = createPointMarkerOnMap();
        setSelectedPointMarker({marker: marker, trackName: ctx.selectedGpxFile.name});
    }

    useEffect(() => {
        if (ctx.selectedGpxFile?.selected) {
            if (ctx.selectedGpxFile.showPoint) {
                showSelectedPointOnMap();
            }
            // else {
            //     showSelectedTrackOnMap();
            // }
        }
        if (ctx.selectedGpxFile?.addPoint) {
            getNewRoute().then();
        }
        checkUpdateLayers()
        checkDragPoint();
    }, [ctx.selectedGpxFile]);

    function checkDragPoint() {
        if (ctx.selectedGpxFile.dragPoint) {
            deleteClickOnMap();
        } else {
            if (ctx.createTrack?.enable) {
                addClickOnMap();
            }
        }
    }

    function checkUpdateLayers() {
        if (ctx.selectedGpxFile?.updateLayers) {
            updateLayers(ctx.selectedGpxFile.tracks[0].points, ctx.selectedGpxFile.layers, true);
            ctx.selectedGpxFile.updateLayers = false;
            saveChanges();
        }
    }

    function updateTrackOnMap(track, active) {
        map.removeLayer(layers[track.name].layer);
        delete layers[track.name];
        addTrackToMap(track, false, active);
    }

    useEffect(() => {
        for (let l in layers) {
            layers[l].active = false;
        }
        Object.values(ctx.localTracks).forEach((track) => {
            let currLayer = layers[track.name]
            if (track.selected && !currLayer) {
                addTrackToMap(track, true, true);
            } else if (currLayer) {
                currLayer.active = track.selected;
                if (track.updated) {
                    updateTrackOnMap(track, currLayer.active);
                }
            }
        });

        for (let l in layers) {
            if (!layers[l].active) {
                if (selectedPointMarker && selectedPointMarker.trackName === l) {
                    map.removeLayer(selectedPointMarker.marker);
                }
                map.removeLayer(layers[l].layer);
                delete layers[l];
            }
        }

        setLayers({...layers});

    }, [ctx.localTracks, ctx.setLocalTracks]);

    async function getNewRoute() {
        let prevPoint = ctx.selectedGpxFile.prevPoint;
        let newPoint = ctx.selectedGpxFile.newPoint;
        let points = ctx.selectedGpxFile.tracks[0].points;
        let layers = ctx.selectedGpxFile.layers;
        ctx.selectedGpxFile.addPoint = false;
        if (prevPoint) {
            getProfile(newPoint, prevPoint, points);
            let marker = new EditableMarker(map, ctx, newPoint, null).create();
            layers.addLayer(marker);
            let polylineTemp = TrackLayerProvider.createTempPolyline(prevPoint, newPoint);
            polylineTemp.addTo(map);
            deleteClickOnMap();
            await TracksManager.updateRouteBetweenPoints(ctx, prevPoint, newPoint).then(res => {
                newPoint.geometry = res;
                map.removeLayer(polylineTemp);
                if (!newPoint.geometry) {
                    delete prevPoint.geometry;
                    points.pop();
                    points.push(prevPoint);
                } else {
                    let polyline = new EditablePolyline(map, ctx, newPoint.geometry, null).create();
                    layers.addLayer(polyline);
                }
                points.push(newPoint);
                addClickOnMap();
                saveChanges();
            });
        } else {
            let marker = new EditableMarker(map, ctx, newPoint, null).create();
            points.push(newPoint);
            layers.addLayer(marker);
            saveCreatedLayers(marker);
        }
    }

    function saveChanges() {
        TracksManager.addDistance(ctx.selectedGpxFile);
        saveCreatedLayers(ctx.selectedGpxFile.layers);
        ctx.setSelectedGpxFile({...ctx.selectedGpxFile});
    }

    function saveCreatedLayers(layers) {
        ctx.createTrack.layers = _.cloneDeep(layers);
        ctx.setCreateTrack({...ctx.createTrack});
    }

    function updateLayers(points, trackLayers, deleteOld) {
        if (trackLayers) {
            let layers = [];
            TrackLayerProvider.parsePoints(points, layers, true);
            layers = createEditableLayers(layers)
            if (deleteOld) {
                trackLayers.clearLayers();
            }
            layers.forEach(layer => {
                trackLayers.addLayer(layer);
            })
        }
    }

    function createEditableLayers(layers) {
        let res = [];
        layers.forEach(layer => {
            if (layer instanceof L.Marker) {
                let editableMarker = new EditableMarker(map, ctx, null, layer).create();
                res.push(editableMarker);
            } else if (layer instanceof L.Polyline) {
                let editablePolyline = new EditablePolyline(map, ctx, null, layer).create();
                res.push(editablePolyline);
            }
        })
        return res;
    }

    function getProfile(newPoint, prevPoint, points) {
        newPoint.profile = ctx.routeMode.mode;
        if (newPoint.profile !== prevPoint.profile) {
            prevPoint.profile = newPoint.profile;
            points.pop();
            points.push(prevPoint);
        }
    }

    useEffect(() => {
        if (ctx.createTrack?.enable && !ctx.createTrack?.layers) {
            if (ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK && ctx.selectedGpxFile?.index >= 0) {
                editCurrentTrack();
            } else {
                deleteOldLayers();
                let type = ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK;
                ctx.setCurrentObjectType(type);
                initNewTrack();
            }
            addClickOnMap();
        } else if (ctx.createTrack?.enable === false) {
            if (ctx.createTrack.layers) {
                map.removeLayer(ctx.createTrack.layers);
                TracksManager.prepareTrack(ctx.selectedGpxFile);
            }
            ctx.setCreateTrack(null);
            deleteClickOnMap();
        }
    }, [ctx.createTrack])

    function addClickOnMap() {
        map.getContainer().style.cursor = 'crosshair';
        map.on("click", clickMap);
    }

    function deleteClickOnMap() {
        map.getContainer().style.cursor = '';
        map.off('click');
    }

    function clickMap(e) {
        ctx.selectedGpxFile.addPoint = true;
        let newPoint = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            profile: ctx.routeMode.mode,
            geometry: []
        };

        if (ctx.selectedGpxFile.newPoint) {
            let points = ctx.selectedGpxFile.tracks[0].points;
            ctx.selectedGpxFile.prevPoint = points[points.length - 1];
        }
        ctx.selectedGpxFile.newPoint = newPoint;
        ctx.setSelectedGpxFile({...ctx.selectedGpxFile});
    }

    function initNewTrack() {
        ctx.selectedGpxFile = {};
        ctx.selectedGpxFile.tracks = [];
        let points = [];
        let track = {};
        track["points"] = points;
        ctx.selectedGpxFile.tracks.push(track);
        ctx.selectedGpxFile.name = TracksManager.createName(ctx);
        ctx.selectedGpxFile.layers = new L.FeatureGroup();
        ctx.selectedGpxFile.layers.addTo(map);

        ctx.setSelectedGpxFile({...ctx.selectedGpxFile});
    }

    function editCurrentTrack() {
        map.removeLayer(layers[ctx.selectedGpxFile.name].layer);
        deleteOldLayers();
        let currentTrack = ctx.localTracks.find(t => t.name === ctx.selectedGpxFile.name);
        if (currentTrack) {
            ctx.selectedGpxFile = _.cloneDeep(currentTrack);
        }
        ctx.selectedGpxFile.layers = new L.FeatureGroup();
        let points = ctx.selectedGpxFile.tracks[0].points;
        updateLayers(points, ctx.selectedGpxFile.layers, true);
        ctx.selectedGpxFile.layers.addTo(map);
        ctx.selectedGpxFile.newPoint = points[points.length - 1];

        ctx.setSelectedGpxFile({...ctx.selectedGpxFile});
    }

    function deleteOldLayers() {
        if (ctx.selectedGpxFile?.layers) {
            map.removeLayer(ctx.selectedGpxFile?.layers);
        }
    }
}