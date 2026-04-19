import React, { createContext, useContext, useReducer, useCallback } from 'react';
import CookieManager from "../cookieManager";
import coloursJSON from "../components/mapart/json/coloursJSON.json";
import DefaultPresets from "../components/mapart/json/defaultPresets.json";
import SupportedVersions from "../components/mapart/json/supportedVersions.json";

// Initial state
const initialState = {
  coloursJSON: null,
  selectedBlocks: {},
  disabledTones: {},
  optionValue_version: Object.values(SupportedVersions)[Object.keys(SupportedVersions).length - 1],
  optionValue_modeNBTOrMapdat: "SCHEMATIC_NBT",
  optionValue_mapSize_x: 1,
  optionValue_mapSize_y: 1,
  optionValue_cropImage: "CENTER",
  optionValue_cropImage_zoom: 10,
  optionValue_cropImage_percent_x: 50,
  optionValue_cropImage_percent_y: 50,
  optionValue_showGridOverlay: false,
  optionValue_staircasing: "VALLEY",
  optionValue_whereSupportBlocks: "ALL_OPTIMIZED",
  optionValue_supportBlock: "cobblestone",
  optionValue_transparency: false,
  optionValue_transparencyTolerance: 0,
  optionValue_mapdatFilenameUseId: true,
  optionValue_mapdatFilenameIdStart: 0,
  optionValue_betterColour: "MapartCraftDefault",
  optionValue_dithering: "FloydSteinberg",
  optionValue_dithering_propagation_red: 100,
  optionValue_dithering_propagation_green: 100,
  optionValue_dithering_propagation_blue: 100,
  optionValue_preprocessingEnabled: false,
  preProcessingValue_brightness: 100,
  preProcessingValue_contrast: 100,
  preProcessingValue_saturation: 100,
  preProcessingValue_backgroundColourSelect: "OFF",
  preProcessingValue_backgroundColour: "#151515",
  optionValue_extras_moreStaircasingOptions: false,
  optionValue_autoZoom: false,
  uploadedImage: null,
  uploadedImage_baseFilename: null,
  presets: [],
  selectedPresetName: "None",
  currentMaterialsData: {
    pixelsData: null,
    maps: [[]],
    currentSelectedBlocks: {},
  },
  mapPreviewWorker_inProgress: false,
  viewOnline_NBT: null,
  viewOnline_3D: false,
  displayingCorruptedPresetWarning: false,
  displayingEdgeWarning: false,
};

// Action types
const ACTIONS = {
  SET_COLOURS_JSON: 'SET_COLOURS_JSON',
  SET_SELECTED_BLOCKS: 'SET_SELECTED_BLOCKS',
  SET_DISABLED_TONES: 'SET_DISABLED_TONES',
  UPDATE_OPTION: 'UPDATE_OPTION',
  SET_UPLOADED_IMAGE: 'SET_UPLOADED_IMAGE',
  SET_PRESETS: 'SET_PRESETS',
  SET_MATERIALS_DATA: 'SET_MATERIALS_DATA',
  SET_WORKER_PROGRESS: 'SET_WORKER_PROGRESS',
  SET_VIEW_ONLINE: 'SET_VIEW_ONLINE',
  SET_WARNINGS: 'SET_WARNINGS',
  RESET_STATE: 'RESET_STATE',
};

// Reducer
const mapartReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_COLOURS_JSON:
      return { ...state, coloursJSON: action.payload };
    
    case ACTIONS.SET_SELECTED_BLOCKS:
      return { ...state, selectedBlocks: action.payload };
    
    case ACTIONS.SET_DISABLED_TONES:
      return { ...state, disabledTones: action.payload };
    
    case ACTIONS.UPDATE_OPTION:
      return { 
        ...state, 
        [action.payload.key]: action.payload.value 
      };
    
    case ACTIONS.SET_UPLOADED_IMAGE:
      return { 
        ...state, 
        uploadedImage: action.payload.image,
        uploadedImage_baseFilename: action.payload.filename 
      };
    
    case ACTIONS.SET_PRESETS:
      return { ...state, presets: action.payload };
    
    case ACTIONS.SET_MATERIALS_DATA:
      return { ...state, currentMaterialsData: action.payload };
    
    case ACTIONS.SET_WORKER_PROGRESS:
      return { ...state, mapPreviewWorker_inProgress: action.payload };
    
    case ACTIONS.SET_VIEW_ONLINE:
      return { 
        ...state, 
        viewOnline_NBT: action.payload.nbt,
        viewOnline_3D: action.payload.is3D 
      };
    
    case ACTIONS.SET_WARNINGS:
      return { 
        ...state, 
        displayingCorruptedPresetWarning: action.payload.corrupted || false,
        displayingEdgeWarning: action.payload.edge || false 
      };
    
    case ACTIONS.RESET_STATE:
      return { ...initialState };
    
    default:
      return state;
  }
};

// Context
const MapartContext = createContext();

// Provider component
export const MapartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(mapartReducer, initialState);

  // Initialize app state
  const initializeApp = useCallback(() => {
    CookieManager.init();
    
    // Load presets
    let cookiesPresets_loaded = JSON.parse(
      CookieManager.touchCookie("mapartcraft_presets", JSON.stringify(DefaultPresets))
    );
    let cookiesPresets_updated = [];
    
    for (const cookiesPreset_loaded of cookiesPresets_loaded) {
      let cookiesPreset_updated = undefined;
      if ("localeKey" in cookiesPreset_loaded) {
        cookiesPreset_updated = DefaultPresets.find(
          (defaultPreset) => defaultPreset.localeKey === cookiesPreset_loaded.localeKey
        );
      }
      if (cookiesPreset_updated === undefined) {
        cookiesPreset_updated = cookiesPreset_loaded;
      }
      cookiesPresets_updated.push(cookiesPreset_updated);
    }
    
    CookieManager.setCookie("mapartcraft_presets", JSON.stringify(cookiesPresets_updated));
    
    // Load custom blocks
    let cookie_customBlocks = JSON.parse(
      CookieManager.touchCookie("mapartcraft_customBlocks", JSON.stringify([]))
    );
    
    // Load MC version
    const cookieMCVersion = CookieManager.touchCookie(
      "mapartcraft_mcversion", 
      Object.values(SupportedVersions)[Object.keys(SupportedVersions).length - 1].MCVersion
    );
    
    const supportedVersionFound = Object.values(SupportedVersions).find(
      (supportedVersion) => supportedVersion.MCVersion === cookieMCVersion
    );
    
    // Initialize colours JSON
    const getMergedColoursJSON = (customBlocks) => {
      let coloursJSON_custom = JSON.parse(JSON.stringify(coloursJSON));
      for (const [colourSetId, customBlock] of customBlocks) {
        coloursJSON_custom[colourSetId].blocks[Object.keys(coloursJSON_custom[colourSetId].blocks).length.toString()] = customBlock;
      }
      return coloursJSON_custom;
    };
    
    const mergedColoursJSON = getMergedColoursJSON(cookie_customBlocks);
    
    // Initialize selected blocks and disabled tones
    const selectedBlocks = {};
    const disabledTones = {};
    
    for (const colourSetId of Object.keys(mergedColoursJSON)) {
      selectedBlocks[colourSetId] = "-1";
      disabledTones[colourSetId] = new Set();
    }
    
    // Check for Edge browser
    const isEdge = !(/*@cc_on!@*/ (false || !!document["documentMode"])) && !!window["StyleMedia"];
    
    dispatch({ type: ACTIONS.SET_COLOURS_JSON, payload: mergedColoursJSON });
    dispatch({ type: ACTIONS.SET_SELECTED_BLOCKS, payload: selectedBlocks });
    dispatch({ type: ACTIONS.SET_DISABLED_TONES, payload: disabledTones });
    dispatch({ type: ACTIONS.SET_PRESETS, payload: cookiesPresets_updated });
    
    if (supportedVersionFound) {
      dispatch({ 
        type: ACTIONS.UPDATE_OPTION, 
        payload: { key: 'optionValue_version', value: supportedVersionFound } 
      });
    }
    
    if (isEdge) {
      dispatch({ 
        type: ACTIONS.SET_WARNINGS, 
        payload: { edge: true } 
      });
    }
  }, []);

  // Action creators
  const actions = {
    setSelectedBlocks: useCallback((blocks) => {
      dispatch({ type: ACTIONS.SET_SELECTED_BLOCKS, payload: blocks });
    }, []),
    
    updateOption: useCallback((key, value) => {
      dispatch({ type: ACTIONS.UPDATE_OPTION, payload: { key, value } });
    }, []),
    
    setUploadedImage: useCallback((image, filename) => {
      dispatch({ 
        type: ACTIONS.SET_UPLOADED_IMAGE, 
        payload: { image, filename } 
      });
    }, []),
    
    setMaterialsData: useCallback((data) => {
      dispatch({ type: ACTIONS.SET_MATERIALS_DATA, payload: data });
    }, []),
    
    setWorkerProgress: useCallback((inProgress) => {
      dispatch({ type: ACTIONS.SET_WORKER_PROGRESS, payload: inProgress });
    }, []),
    
    setViewOnline: useCallback((nbt, is3D) => {
      dispatch({ 
        type: ACTIONS.SET_VIEW_ONLINE, 
        payload: { nbt, is3D } 
      });
    }, []),
    
    setWarnings: useCallback((corrupted = false, edge = false) => {
      dispatch({ 
        type: ACTIONS.SET_WARNINGS, 
        payload: { corrupted, edge } 
      });
    }, []),
    
    resetState: useCallback(() => {
      dispatch({ type: ACTIONS.RESET_STATE });
    }, []),
  };

  const value = {
    state,
    actions,
    initializeApp,
  };

  return (
    <MapartContext.Provider value={value}>
      {children}
    </MapartContext.Provider>
  );
};

// Custom hook to use the context
export const useMapart = () => {
  const context = useContext(MapartContext);
  if (!context) {
    throw new Error('useMapart must be used within a MapartProvider');
  }
  return context;
};
