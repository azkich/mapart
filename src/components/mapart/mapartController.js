import React, { Component } from "react";
import { useMapart } from "../../context/MapartContext";
import { useLocale } from "../../hooks/useLocale";

import CookieManager from "../../cookieManager";
import BlockSelection from "./blockSelection";
import GreenButtons from "./greenButtons";
import MapPreview from "./mapPreview";
import MapSettings from "./mapSettings";
import Materials from "./materials";
import coloursJSON from "./json/coloursJSON.json";
import ViewOnline2D from "./viewOnline2D/viewOnline2D";
import ViewOnline3D from "./viewOnline3D/viewOnline3D";

import BackgroundColourModes from "./json/backgroundColourModes.json";
import ColourMethods from "./json/colourMethods.json";
import CropModes from "./json/cropModes.json";
import DefaultPresets from "./json/defaultPresets.json";
import DitherMethods from "./json/ditherMethods.json";
import MapModes from "./json/mapModes.json";
import SupportedVersions from "./json/supportedVersions.json";
import WhereSupportBlocksModes from "./json/whereSupportBlocksModes.json";

import IMG_Upload from "../../images/upload.png";

import "./mapartController.css";

/** Palette export .js is `const mapartcraftPalette = <JSON>;` — parse without eval/new Function. */
function extractBalancedObjectLiteral(source, openBraceIndex) {
  let depth = 0;
  let inString = false;
  let stringDelim = null;
  let escape = false;
  const start = openBraceIndex;
  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringDelim) {
        inString = false;
        stringDelim = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringDelim = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  return null;
}

function parsePaletteExportJsFile(fileContent) {
  const marker = 'const mapartcraftPalette = ';
  const idx = fileContent.indexOf(marker);
  if (idx === -1) {
    throw new Error('Invalid palette format');
  }
  let pos = idx + marker.length;
  while (pos < fileContent.length && /\s/.test(fileContent[pos])) pos++;
  if (fileContent[pos] !== '{') {
    throw new Error('Invalid palette format');
  }
  const jsonStr = extractBalancedObjectLiteral(fileContent, pos);
  if (!jsonStr) {
    throw new Error('Invalid palette format');
  }
  return JSON.parse(jsonStr);
}

// Wrapper component to use hooks
const MapartControllerWrapper = (props) => {
  const { state, actions } = useMapart();
  const { getLocaleString } = useLocale();
  
  return (
    <MapartController 
      {...props} 
      state={state} 
      actions={actions} 
      getLocaleString={getLocaleString} 
    />
  );
};

class MapartController extends Component {
  state = {
    coloursJSON: null,
    selectedBlocks: {},
    disabledTones: {},
    optionValue_version: Object.values(SupportedVersions)[Object.keys(SupportedVersions).length - 1], // default to the latest version supported
    optionValue_modeNBTOrMapdat: MapModes.SCHEMATIC_NBT.uniqueId,
    optionValue_mapSize_x: 1,
    optionValue_mapSize_y: 1,
    optionValue_cropImage: CropModes.CENTER.uniqueId,
    optionValue_cropImage_zoom: 10, // this gets scaled down by a factor of 10
    optionValue_cropImage_percent_x: 50,
    optionValue_cropImage_percent_y: 50,
    optionValue_showGridOverlay: false,
    optionValue_staircasing: MapModes.SCHEMATIC_NBT.staircaseModes.VALLEY.uniqueId,
    optionValue_whereSupportBlocks: WhereSupportBlocksModes.ALL_OPTIMIZED.uniqueId,
    optionValue_supportBlock: "cobblestone",
    optionValue_transparency: false,
    optionValue_transparencyTolerance: 0,
    optionValue_mapdatFilenameUseId: true,
    optionValue_mapdatFilenameIdStart: 0,
    optionValue_betterColour: ColourMethods.MapartCraftDefault.uniqueId,
    optionValue_dithering: DitherMethods.FloydSteinberg.uniqueId,
    optionValue_dithering_propagation_red: 100,
    optionValue_dithering_propagation_green: 100,
    optionValue_dithering_propagation_blue: 100,
    optionValue_preprocessingEnabled: false,
    preProcessingValue_brightness: 100,
    preProcessingValue_contrast: 100,
    preProcessingValue_saturation: 100,
    preProcessingValue_backgroundColourSelect: BackgroundColourModes.OFF.uniqueId,
    preProcessingValue_backgroundColour: "#151515",
    optionValue_extras_moreStaircasingOptions: false,
    optionValue_autoZoom: false,
    optionValue_image2map: false, // New option for automatic map size calculation
    uploadedImage: null,
    uploadedImage_baseFilename: null,
    presets: [],
    selectedPresetName: "None",
    currentMaterialsData: {
      pixelsData: null,
      maps: [[]], // entries are dictionaries with keys "materials", "supportBlockCount"
      currentSelectedBlocks: {}, // we keep this soley for materials.js
    },
    mapPreviewWorker_inProgress: false,
    viewOnline_NBT: null,
    viewOnline_3D: false,
    showPaletteFormatModal: false,
  };

  constructor(props) {
    super(props);
    
    // Get getLocaleString from props
    this.getLocaleString = props.getLocaleString;
    
    // update default presets to latest version; done via checking for localeString
    CookieManager.init();
    let cookiesPresets_loaded = JSON.parse(CookieManager.touchCookie("mapartcraft_presets", JSON.stringify(DefaultPresets)));
    let cookiesPresets_updated = [];
    for (const cookiesPreset_loaded of cookiesPresets_loaded) {
      let cookiesPreset_updated = undefined;
      if ("localeKey" in cookiesPreset_loaded) {
        cookiesPreset_updated = DefaultPresets.find((defaultPreset) => defaultPreset.localeKey === cookiesPreset_loaded.localeKey);
      }
      if (cookiesPreset_updated === undefined) {
        cookiesPreset_updated = cookiesPreset_loaded;
      }
      cookiesPresets_updated.push(cookiesPreset_updated);
    }
    CookieManager.setCookie("mapartcraft_presets", JSON.stringify(cookiesPresets_updated));
    this.state.presets = cookiesPresets_updated;

    let cookie_customBlocks = JSON.parse(CookieManager.touchCookie("mapartcraft_customBlocks", JSON.stringify([])));
    this.state.coloursJSON = this.getMergedColoursJSON(cookie_customBlocks);

    for (const colourSetId of Object.keys(this.state.coloursJSON)) {
      this.state.selectedBlocks[colourSetId] = "-1";
      this.state.disabledTones[colourSetId] = new Set();
    }

    const cookieMCVersion = CookieManager.touchCookie("mapartcraft_mcversion", Object.values(SupportedVersions)[Object.keys(SupportedVersions).length - 1].MCVersion);
    const supportedVersionFound = Object.values(SupportedVersions).find((supportedVersion) => supportedVersion.MCVersion === cookieMCVersion);
    if (supportedVersionFound !== undefined) {
      this.state.optionValue_version = supportedVersionFound;
    }

    // Load image2map setting from cookie
    const cookieImage2Map = CookieManager.touchCookie("mapartcraft_image2map", "false");
    this.state.optionValue_image2map = cookieImage2Map === "true";

    const URLParams = new URL(window.location).searchParams;
    if (URLParams.has("preset")) {
      const decodedPresetBlocks = this.URLToPreset(URLParams.get("preset"));
      if (decodedPresetBlocks !== null) {
        this.state.selectedBlocks = decodedPresetBlocks;
      }
    }
  }

  getMergedColoursJSON(customBlocks) {
    // this is how we currently merge custom blocks into coloursJSON at runtime / when custom blocks update. this may change if presets support for custom blocks is added
    let coloursJSON_custom = JSON.parse(JSON.stringify(coloursJSON)); // hmmm
    for (const [colourSetId, customBlock] of customBlocks) {
      coloursJSON_custom[colourSetId].blocks[Object.keys(coloursJSON_custom[colourSetId].blocks).length.toString()] = customBlock;
    }
    return coloursJSON_custom;
  }

  eventListener_dragover = function (e) {
    // this has to be here for drop event to work
    e.preventDefault();
    e.stopPropagation();
  };

  eventListener_drop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      // Only accept image files
      if (file.type.startsWith('image/')) {
        const imgUrl = URL.createObjectURL(file);
        this.loadUploadedImageFromURL(imgUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }.bind(this);

  eventListener_paste = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.clipboardData.files;
    if (files.length) {
      const file = files[0];
      // Only accept image files
      if (file.type.startsWith('image/')) {
        const imgUrl = URL.createObjectURL(file);
        this.loadUploadedImageFromURL(imgUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }.bind(this);

  componentDidMount() {
    this.loadUploadedImageFromURL(IMG_Upload, "mapart");

    document.addEventListener("dragover", this.eventListener_dragover);
    document.addEventListener("drop", this.eventListener_drop);

    document.addEventListener("paste", this.eventListener_paste);
  }

  componentWillUnmount() {
    // Ensure page scroll is restored when leaving the page
    document.body.style.overflow = '';
    document.removeEventListener("dragover", this.eventListener_dragover);
    document.removeEventListener("drop", this.eventListener_drop);
    document.removeEventListener("paste", this.eventListener_paste);
  }

  onFileDialogEvent = (e) => {
    const files = e.target.files;
    if (!files.length) {
      return;
    } else {
      const file = files[0];
      const imgUrl = URL.createObjectURL(file);
      this.loadUploadedImageFromURL(imgUrl, file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  loadUploadedImageFromURL(imageURL, baseFilename) {
    const img = new Image();
    img.onload = () => {
      this.setState({
        uploadedImage: img,
        uploadedImage_baseFilename: baseFilename,
      }, () => {
        // Auto-calculate map size if image2map is enabled
        if (this.state.optionValue_image2map) {
          this.calculateMapSizeFromImage(img);
        }
      });
    };
    img.src = imageURL;
  }

  calculateMapSizeFromImage(img) {
    // Calculate optimal map size based on image dimensions
    // Standard map size is 128x128 pixels
    const mapPixelSize = 128;
    const imageWidth = img.width;
    const imageHeight = img.height;
    
    // Calculate how many maps we need for each dimension
    const mapsX = Math.ceil(imageWidth / mapPixelSize);
    const mapsY = Math.ceil(imageHeight / mapPixelSize);
    
    // Ensure minimum size of 1x1
    const finalMapsX = Math.max(1, mapsX);
    const finalMapsY = Math.max(1, mapsY);
    
    this.setState({
      optionValue_mapSize_x: finalMapsX,
      optionValue_mapSize_y: finalMapsY,
    });
  }

  handleChangeColourSetBlock = (colourSetId, blockId) => {
    let selectedBlocks = { ...this.state.selectedBlocks };
    selectedBlocks[colourSetId] = blockId;
    this.setState({
      selectedBlocks,
    });
  };

  handleChangeColourSetBlocks = (setsAndBlocks) => {
    const { coloursJSON, optionValue_version } = this.state;
    let selectedBlocks = {};
    for (const colourSetId of Object.keys(coloursJSON)) {
      selectedBlocks[colourSetId] = "-1";
    }
    for (const [int_colourSetId, presetIndex] of setsAndBlocks) {
      // we store presetIndex in the cookie, not blockId
      const colourSetId = int_colourSetId.toString();
      if (!(colourSetId in coloursJSON)) {
        continue;
      }
      const blockIdAndBlock = Object.entries(coloursJSON[colourSetId].blocks).find(([, block]) => block.presetIndex === presetIndex);
      if (blockIdAndBlock === undefined) {
        continue;
      }
      const blockId = blockIdAndBlock[0];
      if (Object.keys(coloursJSON[colourSetId].blocks[blockId].validVersions).includes(optionValue_version.MCVersion)) {
        selectedBlocks[colourSetId] = blockId;
      }
    }
    this.setState({
      selectedBlocks,
    });
  };

  handleToggleColourTone = (colourSetId, tone) => {
    let disabledTones = { ...this.state.disabledTones };

    const set = disabledTones[colourSetId];

    if (set.has(tone))
      set.delete(tone);
    else
      set.add(tone);

    this.setState({
      disabledTones,
    });
  };

  onOptionChange_modeNBTOrMapdat = (e) => {
    const mode = parseInt(e.target.value);
    this.setState({ optionValue_modeNBTOrMapdat: mode });
    if (mode === MapModes.SCHEMATIC_NBT.uniqueId) {
      this.setState({ optionValue_staircasing: MapModes.SCHEMATIC_NBT.staircaseModes.VALLEY.uniqueId });
    } else {
      this.setState({ optionValue_staircasing: MapModes.MAPDAT.staircaseModes.ON_UNOBTAINABLE.uniqueId });
    }
  };

  onOptionChange_version = (e) => {
    const { coloursJSON } = this.state;
    const mcVersion = e.target.value;
    CookieManager.setCookie("mapartcraft_mcversion", mcVersion);
    const supportedVersionFound = Object.values(SupportedVersions).find((supportedVersion) => supportedVersion.MCVersion === mcVersion);
    this.setState((currentState) => {
      let selectedBlocks = { ...currentState.selectedBlocks };
      for (const [colourSetId, colourSet] of Object.entries(coloursJSON)) {
        if (selectedBlocks[colourSetId] !== "-1" && !Object.keys(colourSet.blocks[selectedBlocks[colourSetId]].validVersions).includes(mcVersion)) {
          selectedBlocks[colourSetId] = "-1";
        }
      }
      return { optionValue_version: supportedVersionFound, selectedBlocks };
    });
  };

  onOptionChange_mapSize_x = (value) => {
    // Only allow manual changes if image2map is disabled
    if (!this.state.optionValue_image2map) {
      this.setState({
        optionValue_mapSize_x: value,
      });
    }
  };

  onOptionChange_mapSize_y = (value) => {
    // Only allow manual changes if image2map is disabled
    if (!this.state.optionValue_image2map) {
      this.setState({
        optionValue_mapSize_y: value,
      });
    }
  };

  onOptionChange_cropImage = (e) => {
    const cropValue = parseInt(e.target.value);
    // CENTER is a special case of MANUAL
    // reset cropImage variables any time we change
    this.setState({
      optionValue_cropImage: cropValue,
      optionValue_cropImage_zoom: 10,
      optionValue_cropImage_percent_x: 50,
      optionValue_cropImage_percent_y: 50,
    });
  };

  onOptionChange_cropImage_zoom = (value) => {
    this.setState({
      optionValue_cropImage_zoom: value,
    });
  };

  onOptionChange_cropImage_percent_x = (value) => {
    this.setState({
      optionValue_cropImage_percent_x: value,
    });
  };

  onOptionChange_cropImage_percent_y = (value) => {
    this.setState({
      optionValue_cropImage_percent_y: value,
    });
  };

  onOptionChange_showGridOverlay = () => {
    this.setState({
      optionValue_showGridOverlay: !this.state.optionValue_showGridOverlay,
    });
    // "updatePreviewScale(0)"
  };

  onOptionChange_staircasing = (e) => {
    const staircasingValue = parseInt(e.target.value);
    this.setState({ optionValue_staircasing: staircasingValue });
  };

  onOptionChange_transparency = () => {
    this.setState({
      optionValue_transparency: !this.state.optionValue_transparency,
    });
  };

  onOptionChange_transparencyTolerance = (value) => {
    this.setState({
      optionValue_transparencyTolerance: value,
    });
  };

  onOptionChange_mapdatFilenameUseId = () => {
    this.setState((currentState) => {
      return {
        optionValue_mapdatFilenameUseId: !currentState.optionValue_mapdatFilenameUseId,
      };
    });
  };

  onOptionChange_mapdatFilenameIdStart = (value) => {
    this.setState({
      optionValue_mapdatFilenameIdStart: value,
    });
  };

  onOptionChange_BetterColour = (e) => {
    const colourValue = parseInt(e.target.value);
    this.setState({ optionValue_betterColour: colourValue });
  };

  onOptionChange_dithering = (e) => {
    const ditheringValue = parseInt(e.target.value);
    this.setState({ optionValue_dithering: ditheringValue });
  };

  onOptionChange_dithering_propagation_red = (value) => {
    this.setState({ optionValue_dithering_propagation_red: value });
  };

  onOptionChange_dithering_propagation_green = (value) => {
    this.setState({ optionValue_dithering_propagation_green: value });
  };

  onOptionChange_dithering_propagation_blue = (value) => {
    this.setState({ optionValue_dithering_propagation_blue: value });
  };

  onOptionChange_WhereSupportBlocks = (e) => {
    const newValue = parseInt(e.target.value);
    this.setState({ optionValue_whereSupportBlocks: newValue });
  };

  setOption_SupportBlock = (text) => {
    this.setState({ optionValue_supportBlock: text });
  };

  onOptionChange_PreProcessingEnabled = () => {
    this.setState({
      optionValue_preprocessingEnabled: !this.state.optionValue_preprocessingEnabled,
    });
  };

  onOptionChange_PreProcessingBrightness = (value) => {
    this.setState({
      preProcessingValue_brightness: value,
    });
  };

  onOptionChange_PreProcessingContrast = (value) => {
    this.setState({
      preProcessingValue_contrast: value,
    });
  };

  onOptionChange_PreProcessingSaturation = (value) => {
    this.setState({
      preProcessingValue_saturation: value,
    });
  };

  onOptionChange_PreProcessingBackgroundColourSelect = (e) => {
    const newValue = parseInt(e.target.value);
    this.setState({ preProcessingValue_backgroundColourSelect: newValue });
  };

  onOptionChange_PreProcessingBackgroundColour = (e) => {
    const newValue = e.target.value;
    this.setState({ preProcessingValue_backgroundColour: newValue });
  };

  onOptionChange_extras_moreStaircasingOptions = () => {
    const { optionValue_modeNBTOrMapdat, optionValue_extras_moreStaircasingOptions } = this.state;
    this.setState({ optionValue_extras_moreStaircasingOptions: !optionValue_extras_moreStaircasingOptions });
    if (optionValue_extras_moreStaircasingOptions) {
      if (optionValue_modeNBTOrMapdat === MapModes.SCHEMATIC_NBT.uniqueId) {
        this.setState({ optionValue_staircasing: MapModes.SCHEMATIC_NBT.staircaseModes.VALLEY.uniqueId });
      } else {
        this.setState({ optionValue_staircasing: MapModes.MAPDAT.staircaseModes.ON_UNOBTAINABLE.uniqueId });
      }
    }
  };

  onOptionChange_autoZoom = () => {
    this.setState({
      optionValue_autoZoom: !this.state.optionValue_autoZoom,
    });
  };

  onOptionChange_image2map = () => {
    const newImage2MapValue = !this.state.optionValue_image2map;
    this.setState({
      optionValue_image2map: newImage2MapValue,
    }, () => {
      // Save setting to cookie
      CookieManager.setCookie("mapartcraft_image2map", newImage2MapValue.toString());
      
      // If enabling image2map and we have an uploaded image, calculate the size
      if (newImage2MapValue && this.state.uploadedImage) {
        this.calculateMapSizeFromImage(this.state.uploadedImage);
      }
    });
  };

  onGetViewOnlineNBT = (viewOnline_NBT) => {
    this.setState({ viewOnline_NBT });
  };

  downloadBlobFile(downloadBlob, filename) {
    const downloadURL = window.URL.createObjectURL(downloadBlob);
    const downloadElt = document.createElement("a");
    downloadElt.style = "display: none";
    downloadElt.href = downloadURL;
    downloadElt.download = filename;
    document.body.appendChild(downloadElt);
    downloadElt.click();
    window.URL.revokeObjectURL(downloadURL);
    document.body.removeChild(downloadElt);
  }

  handleGetPDNPaletteClicked = () => {
    window.scrollTo(0, 0);
    this.setState({ showPaletteFormatModal: true });
    document.body.style.overflow = 'hidden';
  };

  closePaletteFormatModal = () => {
    this.setState({ showPaletteFormatModal: false });
    document.body.style.overflow = '';
  };

  getColoursToExport = () => {
    const { coloursJSON, selectedBlocks, optionValue_modeNBTOrMapdat, optionValue_staircasing } = this.state;
    const toneKeysToExport = Object.values(Object.values(MapModes).find((mapMode) => mapMode.uniqueId === optionValue_modeNBTOrMapdat).staircaseModes).find(
      (staircaseMode) => staircaseMode.uniqueId === optionValue_staircasing
    ).toneKeys;
    
    const colours = [];
    for (const [selectedBlock_colourSetId, selectedBlock_blockId] of Object.entries(selectedBlocks)) {
      if (selectedBlock_blockId !== "-1") {
        let blockColours = coloursJSON[selectedBlock_colourSetId].tonesRGB;
        for (const toneKeyToExport of toneKeysToExport) {
          colours.push(blockColours[toneKeyToExport]);
        }
      }
    }
    return colours;
  };

  generatePaintNetPalette = () => {
    const { getLocaleString } = this.props;
    const { coloursJSON, selectedBlocks, optionValue_staircasing } = this.state;
    const colours = this.getColoursToExport();
    
    if (colours.length === 0) {
      alert(getLocaleString("BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-NONE-SELECTED"));
      return;
    } else if (colours.length > 96) {
      alert(
        `${getLocaleString("BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-MAX-COLOURS-1")}${colours.length.toString()}${getLocaleString(
          "BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-MAX-COLOURS-2"
        )}`
      );
    }

    let paletteText =
      "; paint.net Palette File\n; Generated by Mapartcraft\n; Thanks for using our service" +
      (Object.entries(selectedBlocks).some(([colourSetId, blockId]) => blockId !== "-1" && coloursJSON[colourSetId].blocks[blockId].presetIndex === "CUSTOM")
        ? "\n; Custom blocks not listed!"
        : "") +
      "\n; staircasing: " +
      ([
        MapModes.SCHEMATIC_NBT.staircaseModes.CLASSIC.uniqueId,
        MapModes.SCHEMATIC_NBT.staircaseModes.VALLEY.uniqueId,
        MapModes.MAPDAT.staircaseModes.ON.uniqueId,
        MapModes.MAPDAT.staircaseModes.ON_UNOBTAINABLE.uniqueId,
      ].includes(optionValue_staircasing)
        ? "enabled"
        : "disabled") +
      "\n; unobtainable colours: " +
      ([MapModes.MAPDAT.staircaseModes.ON_UNOBTAINABLE.uniqueId, MapModes.MAPDAT.staircaseModes.FULL_UNOBTAINABLE.uniqueId].includes(optionValue_staircasing)
        ? "enabled"
        : "disabled") +
      "\n";
    
    for (const colour of colours) {
      paletteText += "FF";
      for (let i = 0; i < 3; i++) {
        paletteText += Number(colour[i]).toString(16).padStart(2, "0").toUpperCase();
      }
      paletteText += "\n";
    }
    
    const downloadBlob = new Blob([paletteText], { type: "text/plain" });
    this.downloadBlobFile(downloadBlob, "MapartcraftPalette.txt");
    this.closePaletteFormatModal();
  };

  generateGIMPPalette = () => {
    const { getLocaleString } = this.props;
    const colours = this.getColoursToExport();
    
    if (colours.length === 0) {
      alert(getLocaleString("BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-NONE-SELECTED"));
      return;
    }

    let paletteText = "GIMP Palette\n";
    paletteText += "Name: Mapartcraft Palette\n";
    paletteText += "Columns: 0\n";
    paletteText += "# Generated by Mapartcraft\n";
    paletteText += "# Thanks for using our service\n";
    
    for (const colour of colours) {
      const r = Math.round(colour[0]);
      const g = Math.round(colour[1]);
      const b = Math.round(colour[2]);
      paletteText += `${r}\t${g}\t${b}\tUntitled\n`;
    }
    
    const downloadBlob = new Blob([paletteText], { type: "text/plain" });
    this.downloadBlobFile(downloadBlob, "MapartcraftPalette.gpl");
    this.closePaletteFormatModal();
  };

  generatePhotoshopPalette = () => {
    const { getLocaleString } = this.props;
    const colours = this.getColoursToExport();
    
    if (colours.length === 0) {
      alert(getLocaleString("BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-NONE-SELECTED"));
      return;
    }

    // Photoshop .aco format (Adobe Color Swatch) - binary format
    // Format: Version (2 bytes), Number of colors (2 bytes), then for each color:
    // Color space (2 bytes), RGB values (6 bytes), Name length (2 bytes), Name (variable)
    const buffer = new ArrayBuffer(4 + colours.length * 10);
    const view = new DataView(buffer);
    
    // Version 1 (2 bytes, big-endian)
    view.setUint16(0, 1, false);
    
    // Number of colors (2 bytes, big-endian)
    view.setUint16(2, colours.length, false);
    
    let offset = 4;
    
    for (let i = 0; i < colours.length; i++) {
      const colour = colours[i];
      const r = Math.round(colour[0]);
      const g = Math.round(colour[1]);
      const b = Math.round(colour[2]);
      
      // Color space: 0 = RGB (2 bytes, big-endian)
      view.setUint16(offset, 0, false);
      offset += 2;
      
      // RGB values (6 bytes, big-endian, 0-65535 range)
      // Convert 0-255 to 0-65535: value * 65535 / 255
      view.setUint16(offset, Math.round(r * 257), false);
      offset += 2;
      view.setUint16(offset, Math.round(g * 257), false);
      offset += 2;
      view.setUint16(offset, Math.round(b * 257), false);
      offset += 2;
      
      // Name length (2 bytes, big-endian) - 0 for no name
      view.setUint16(offset, 0, false);
      offset += 2;
    }
    
    const downloadBlob = new Blob([buffer], { type: "application/octet-stream" });
    this.downloadBlobFile(downloadBlob, "MapartcraftPalette.aco");
    this.closePaletteFormatModal();
  };

  handleGenerateColorScheme = () => {
    const { getLocaleString } = this.props;
    const { coloursJSON, selectedBlocks, optionValue_modeNBTOrMapdat, optionValue_staircasing } = this.state;
    
    const selectedBlocksArray = Object.entries(selectedBlocks).filter(([colourSetId, blockId]) => blockId !== "-1");
    
    if (selectedBlocksArray.length === 0) {
      alert(getLocaleString("BLOCK-SELECTION/PRESETS/DOWNLOAD-WARNING-NONE-SELECTED"));
      return;
    }

    const toneKeysToExport = Object.values(Object.values(MapModes).find((mapMode) => mapMode.uniqueId === optionValue_modeNBTOrMapdat).staircaseModes).find(
      (staircaseMode) => staircaseMode.uniqueId === optionValue_staircasing
    ).toneKeys;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const squareSize = 80;
    const padding = 15;
    const textHeight = 25;
    const titleHeight = 30;
    const squaresPerRow = 3;

    const rows = selectedBlocksArray.length;
    const canvasWidth = squaresPerRow * squareSize + (squaresPerRow + 1) * padding;
    const canvasHeight = rows * (squareSize + textHeight + titleHeight + padding) + padding;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Colour scheme — Mapartcraft', canvasWidth / 2, 20);

    // RGB to HEX
    const rgbToHex = (r, g, b) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    };
    
    const getToneName = (toneKey) => {
      const toneNames = {
        'dark': 'Dark',
        'normal': 'Normal', 
        'light': 'Light',
        'unobtainable': 'Unobtainable'
      };
      return toneNames[toneKey] || toneKey;
    };
    
    selectedBlocksArray.forEach(([colourSetId, blockId], rowIndex) => {
      const colourSet = coloursJSON[colourSetId];
      const block = colourSet.blocks[blockId];
      const colours = colourSet.tonesRGB;

      const blockTitleY = 40 + rowIndex * (squareSize + textHeight + titleHeight + padding);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(block.displayName, padding, blockTitleY);

      toneKeysToExport.forEach((toneKey, colIndex) => {
        const x = colIndex * squareSize + (colIndex + 1) * padding;
        const y = blockTitleY + 5;

        const rgb = colours[toneKey];
        const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
        ctx.fillStyle = hexColor;
        ctx.fillRect(x, y, squareSize, squareSize);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, squareSize, squareSize);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(getToneName(toneKey), x + squareSize / 2, y + squareSize + 15);

        ctx.font = '10px Arial';
        ctx.fillText(hexColor, x + squareSize / 2, y + squareSize + 28);
      });
    });

    canvas.toBlob((blob) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      this.downloadBlobFile(blob, `color-scheme-${timestamp}.png`);
    }, 'image/png');
  };

  handlePresetChange = (e) => {
    const presetName = e.target.value;
    const { presets } = this.state;

    this.setState({ selectedPresetName: presetName });

    if (presetName === "None") {
      this.handleChangeColourSetBlocks([]);
    } else {
      const selectedPreset = presets.find((preset) => preset.name === presetName);
      if (selectedPreset !== undefined) {
        this.handleChangeColourSetBlocks(selectedPreset.blocks);
      }
    }
  };

  canDeletePreset = () => {
    const { selectedPresetName } = this.state;
    return selectedPresetName !== "None" && !DefaultPresets.find((defaultPreset) => defaultPreset.name === selectedPresetName);
  };

  handleDeletePreset = () => {
    const { getLocaleString } = this.props;
    const { presets, selectedPresetName } = this.state;
    if (!this.canDeletePreset()) return;
    if (!window.confirm(`${getLocaleString("BLOCK-SELECTION/PRESETS/DELETE-CONFIRM")} ${selectedPresetName}`)) return;
    const presets_new = presets.filter((preset) => preset.name !== selectedPresetName);
    this.setState({
      presets: presets_new,
      selectedPresetName: "None",
    });
    CookieManager.setCookie("mapartcraft_presets", JSON.stringify(presets_new));
  };

  handleSavePreset = () => {
    const { getLocaleString } = this.props;
    const { coloursJSON, presets, selectedBlocks } = this.state;

    let presetToSave_name = prompt(getLocaleString("BLOCK-SELECTION/PRESETS/SAVE-PROMPT-ENTER-NAME"), "");
    if (presetToSave_name === null) {
      return;
    }

    const otherPresets = presets.filter((preset) => preset.name !== presetToSave_name);
    let newPreset = { name: presetToSave_name, blocks: [] };
    Object.keys(selectedBlocks).forEach((key) => {
      if (selectedBlocks[key] !== "-1" && coloursJSON[key].blocks[selectedBlocks[key]].presetIndex !== "CUSTOM") {
        newPreset.blocks.push([parseInt(key), parseInt(coloursJSON[key].blocks[selectedBlocks[key]].presetIndex)]);
      }
    });
    const presets_new = [...otherPresets, newPreset];
    this.setState({
      presets: presets_new,
      selectedPresetName: presetToSave_name,
    });
    CookieManager.setCookie("mapartcraft_presets", JSON.stringify(presets_new));
  };

  selectedBlocksToURL = () => {
    // colourSetId encoded in base 36 as [0-9a-z]
    // blockId encoded in modified base 26 as [Q-ZA-P]
    const { coloursJSON, selectedBlocks } = this.state;
    let presetQueryString = "";
    for (const [colourSetId, blockId] of Object.entries(selectedBlocks)) {
      if (blockId !== "-1" && coloursJSON[colourSetId].blocks[blockId].presetIndex !== "CUSTOM") {
        presetQueryString += parseInt(colourSetId).toString(36);
        presetQueryString += coloursJSON[colourSetId].blocks[blockId].presetIndex
          .toString(26)
          .toUpperCase()
          .replace(/[0-9]/g, (match) => {
            return {
              0: "Q",
              1: "R",
              2: "S",
              3: "T",
              4: "U",
              5: "V",
              6: "W",
              7: "X",
              8: "Y",
              9: "Z",
            }[match];
          });
      }
    }
    const publicPath = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const pathPrefix = publicPath ? `${publicPath}/` : "/";
    return `${base}${pathPrefix}?preset=${presetQueryString}`;
  };

  handleExportPreset = () => {
    const { getLocaleString } = this.props;
    const { coloursJSON, selectedBlocks } = this.state;
    if (Object.keys(selectedBlocks).every((colourSetId) => selectedBlocks[colourSetId] === "-1")) {
      alert(getLocaleString("BLOCK-SELECTION/PRESETS/EXPORT-WARNING-NONE-SELECTED"));
      return;
    }
    
    if (
      Object.entries(selectedBlocks).some(([colourSetId, blockId]) => blockId !== "-1" && coloursJSON[colourSetId].blocks[blockId].presetIndex === "CUSTOM")
    ) {
      alert(getLocaleString("BLOCK-SELECTION/ADD-CUSTOM/NO-EXPORT"));
      return;
    }
    
    let paletteName = prompt(getLocaleString("BLOCK-SELECTION/PRESETS/EXPORT-PROMPT-ENTER-NAME"), "");
    if (paletteName === null) {
      return;
    }

    if (paletteName.trim() === "") {
      paletteName = "Exported Palette";
    }

    let exportData = { 
      name: paletteName.trim(),
      blocks: [],
      exportedAt: new Date().toISOString()
    };
    
    Object.keys(selectedBlocks).forEach((colourSetId) => {
      if (selectedBlocks[colourSetId] !== "-1" && coloursJSON[colourSetId].blocks[selectedBlocks[colourSetId]].presetIndex !== "CUSTOM") {
        exportData.blocks.push([parseInt(colourSetId), parseInt(coloursJSON[colourSetId].blocks[selectedBlocks[colourSetId]].presetIndex)]);
      }
    });
    
    const jsContent = `// MapartCraft Palette Export
// Name: ${exportData.name}
// Exported at: ${exportData.exportedAt}
const mapartcraftPalette = ${JSON.stringify(exportData, null, 2)};

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mapartcraftPalette;
}`;
    
    const downloadBlob = new Blob([jsContent], { type: "application/javascript" });
    const sanitizedName = exportData.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    this.downloadBlobFile(downloadBlob, `${sanitizedName}-${timestamp}.js`);
  };

  handleImportPreset = () => {
    const { getLocaleString } = this.props;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,application/javascript,text/javascript';
    input.style.display = 'none';
    
    input.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target.result;

          const importedData = parsePaletteExportJsFile(fileContent);

          if (!importedData || !importedData.blocks || !Array.isArray(importedData.blocks)) {
            throw new Error('Invalid palette format');
          }

          this.handleChangeColourSetBlocks(importedData.blocks);

          const { presets } = this.state;
          const paletteName = importedData.name || "Imported Palette";

          const otherPresets = presets.filter((preset) => preset.name !== paletteName);

          let newPreset = { name: paletteName, blocks: importedData.blocks };
          const presets_new = [...otherPresets, newPreset];

          this.setState({
            presets: presets_new,
            selectedPresetName: paletteName,
          });
          CookieManager.setCookie("mapartcraft_presets", JSON.stringify(presets_new));
          
          alert(getLocaleString("BLOCK-SELECTION/PRESETS/IMPORT-SUCCESS-WITH-SAVE") + " \"" + paletteName + "\"");
          
        } catch (error) {
          console.error('Import error:', error);
          alert(getLocaleString("BLOCK-SELECTION/PRESETS/IMPORT-ERROR"));
        } finally {
          document.body.removeChild(input);
        }
      };
      
      reader.onerror = () => {
        alert(getLocaleString("BLOCK-SELECTION/PRESETS/IMPORT-ERROR"));
        document.body.removeChild(input);
      };
      
      reader.readAsText(file);
    });
    
    document.body.appendChild(input);
    input.click();
  };

  URLToPreset = (encodedPreset) => {
    const { onCorruptedPreset } = this.props;
    const { coloursJSON, optionValue_version } = this.state;
    switch (encodedPreset) {
      case "dQw4w9WgXcQ":
        window.location.replace("https://www.youtube.com/watch?v=cZ5wOPinZd4");
        return null;
      case "mares":
        document.body.style.backgroundSize="100%";
        fetch("https://derpibooru.org/api/v1/json/search/images?q=scenery,score.gte:1000,safe&sf=random&per_page=1").then(req=>req.json()).then(derp=>document.body.style.backgroundImage=`url(${derp.images[0].representations.full})`);
        return null;
      default:
        break;
    }
    if (!/^[0-9a-zQ-ZA-P]*$/g.test(encodedPreset)) {
      onCorruptedPreset();
      return null;
    }
    let selectedBlocks = { ...this.state.selectedBlocks };
    let presetRegex = /([0-9a-z]+)(?=([Q-ZA-P]+))/g;
    let match;
    while ((match = presetRegex.exec(encodedPreset)) !== null) {
      const encodedColourSetId = match[1];
      const encodedBlockId = match[2];
      const decodedColourSetId = parseInt(encodedColourSetId, 36).toString();
      const decodedPresetIndex = parseInt(
        encodedBlockId
          .replace(/[Q-Z]/g, (match) => {
            return {
              Q: "0",
              R: "1",
              S: "2",
              T: "3",
              U: "4",
              V: "5",
              W: "6",
              X: "7",
              Y: "8",
              Z: "9",
            }[match];
          })
          .toLowerCase(),
        26
      );
      if (!(decodedColourSetId in coloursJSON)) {
        continue;
      }
      const decodedBlock = Object.entries(coloursJSON[decodedColourSetId].blocks).find((elt) => elt[1].presetIndex === decodedPresetIndex);
      if (decodedBlock === undefined) {
        continue;
      }
      const decodedBlockId = decodedBlock[0].toString();
      if (Object.keys(coloursJSON[decodedColourSetId].blocks[decodedBlockId].validVersions).includes(optionValue_version.MCVersion)) {
        selectedBlocks[decodedColourSetId] = decodedBlockId;
      }
    }
    return selectedBlocks;
  };

  onMapPreviewWorker_begin = () => {
    this.setState({ mapPreviewWorker_inProgress: true });
  };

  handleSetMapMaterials = (currentMaterialsData) => {
    this.setState({ currentMaterialsData: currentMaterialsData, mapPreviewWorker_inProgress: false });
  };

  onChooseViewOnline3D = () => {
    this.setState({ viewOnline_3D: true });
  };

  handleViewOnline3DEscape = () => {
    this.setState({
      viewOnline_NBT: null,
      viewOnline_3D: false,
    });
  };

  handleAddCustomBlock = (block_colourSetId, block_name, block_nbtTags, block_versions, block_needsSupport, block_flammable) => {
    const { getLocaleString } = this.props;
    // const {coloursJSON} = this.state;
    const block_name_trimmed = block_name.trim();
    if (block_name_trimmed === "") {
      alert(getLocaleString("BLOCK-SELECTION/ADD-CUSTOM/ERROR-NO-NAME"));
      return;
    }
    if (Object.values(block_versions).every((t) => !t)) {
      alert(getLocaleString("BLOCK-SELECTION/ADD-CUSTOM/ERROR-NONE-SELECTED"));
      return;
    }
    let blockToAdd = {
      displayName: block_name_trimmed,
      validVersions: {},
      supportBlockMandatory: block_needsSupport,
      flammable: block_flammable,
      presetIndex: "CUSTOM",
    };
    let addedFirstVersion = false;
    for (const [block_version, block_version_isSelected] of Object.entries(block_versions)) {
      if (!block_version_isSelected) {
        continue;
      }
      if (addedFirstVersion) {
        blockToAdd.validVersions[SupportedVersions[block_version].MCVersion] = `&${Object.keys(blockToAdd.validVersions)[0]}`;
      } else {
        blockToAdd.validVersions[SupportedVersions[block_version].MCVersion] = {
          NBTName: block_name_trimmed,
          NBTArgs: {},
        };
        for (const [nbtTag_key, nbtTag_value] of block_nbtTags) {
          const nbtTag_key_trimmed = nbtTag_key.trim();
          const nbtTag_value_trimmed = nbtTag_value.trim();
          if (!(nbtTag_key_trimmed === "" && nbtTag_value_trimmed === "")) {
            blockToAdd.validVersions[SupportedVersions[block_version].MCVersion].NBTArgs[nbtTag_key_trimmed] = nbtTag_value_trimmed;
          }
        }
        addedFirstVersion = true;
      }
    }

    const customBlocks = JSON.parse(CookieManager.getCookie("mapartcraft_customBlocks"));
    let customBlocks_new = customBlocks.filter(
      (customBlock) =>
        customBlock[0] !== block_colourSetId ||
        customBlock[1].displayName !== block_name_trimmed ||
        !Object.values(SupportedVersions).some(
          (supportedVersion_value) =>
            supportedVersion_value.MCVersion in customBlock[1].validVersions && supportedVersion_value.MCVersion in blockToAdd.validVersions
        )
    ); // filter removes customBlocks that have the same colourSet, name, and some versions in common as the one we are adding. For example this allows us to add different 1.12.2 and 1.13+ versions of a block
    customBlocks_new.push([block_colourSetId, blockToAdd]);

    this.setState((currentState) => {
      return { coloursJSON: this.getMergedColoursJSON(customBlocks_new), selectedBlocks: { ...currentState.selectedBlocks, [block_colourSetId]: "-1" } };
    });
    CookieManager.setCookie("mapartcraft_customBlocks", JSON.stringify(customBlocks_new));
  };

  handleDeleteCustomBlock = (block_colourSetId, block_name, block_versions) => {
    const block_name_trimmed = block_name.trim();
    if (block_name_trimmed === "" || Object.values(block_versions).every((t) => !t)) {
      return;
    }

    let validVersions = [];
    for (const [block_version, block_version_isSelected] of Object.entries(block_versions)) {
      if (block_version_isSelected) {
        validVersions.push(SupportedVersions[block_version].MCVersion);
      }
    }

    const customBlocks = JSON.parse(CookieManager.getCookie("mapartcraft_customBlocks"));
    let customBlocks_new = customBlocks.filter(
      (customBlock) =>
        customBlock[0] !== block_colourSetId ||
        customBlock[1].displayName !== block_name_trimmed ||
        !Object.values(SupportedVersions).some(
          (supportedVersion_value) =>
            supportedVersion_value.MCVersion in customBlock[1].validVersions && validVersions.includes(supportedVersion_value.MCVersion)
        )
    );

    this.setState((currentState) => {
      return {
        coloursJSON: this.getMergedColoursJSON(customBlocks_new),
        selectedBlocks: { ...currentState.selectedBlocks, [block_colourSetId]: "-1" },
        currentMaterialsData: {
          // reset currentMaterialsData as materials.js uses a cached version of materials which could contain blocks which no longer exist
          pixelsData: null,
          maps: [[]],
          currentSelectedBlocks: {},
        },
      };
    });
    CookieManager.setCookie("mapartcraft_customBlocks", JSON.stringify(customBlocks_new));
  };

  render() {
    const { getLocaleString } = this;
    const {
      coloursJSON,
      selectedBlocks,
      disabledTones,
      optionValue_version,
      optionValue_modeNBTOrMapdat,
      optionValue_mapSize_x,
      optionValue_mapSize_y,
      optionValue_cropImage,
      optionValue_cropImage_zoom,
      optionValue_cropImage_percent_x,
      optionValue_cropImage_percent_y,
      optionValue_showGridOverlay,
      optionValue_staircasing,
      optionValue_whereSupportBlocks,
      optionValue_supportBlock,
      optionValue_transparency,
      optionValue_transparencyTolerance,
      optionValue_mapdatFilenameUseId,
      optionValue_mapdatFilenameIdStart,
      optionValue_betterColour,
      optionValue_dithering,
      optionValue_dithering_propagation_red,
      optionValue_dithering_propagation_green,
      optionValue_dithering_propagation_blue,
      optionValue_preprocessingEnabled,
      preProcessingValue_brightness,
      preProcessingValue_contrast,
      preProcessingValue_saturation,
      preProcessingValue_backgroundColourSelect,
      preProcessingValue_backgroundColour,
      optionValue_extras_moreStaircasingOptions,
      optionValue_autoZoom,
      optionValue_image2map,
      uploadedImage,
      uploadedImage_baseFilename,
      presets,
      selectedPresetName,
      currentMaterialsData,
      mapPreviewWorker_inProgress,
      viewOnline_NBT,
      viewOnline_3D,
      showPaletteFormatModal,
    } = this.state;
    return (
      <div className="mapartController">
        <BlockSelection
          getLocaleString={getLocaleString}
          coloursJSON={coloursJSON}
          disabledTones={disabledTones}
          onChangeColourSetBlock={this.handleChangeColourSetBlock}
          onToggleColourTone={this.handleToggleColourTone}
          optionValue_version={optionValue_version}
          optionValue_modeNBTOrMapdat={optionValue_modeNBTOrMapdat}
          optionValue_staircasing={optionValue_staircasing}
          selectedBlocks={selectedBlocks}
          presets={presets}
          selectedPresetName={selectedPresetName}
          canDeletePreset={this.canDeletePreset}
          onPresetChange={this.handlePresetChange}
          onDeletePreset={this.handleDeletePreset}
          onSavePreset={this.handleSavePreset}
          onExportPreset={this.handleExportPreset}
          onImportPreset={this.handleImportPreset}
          onGetPDNPaletteClicked={this.handleGetPDNPaletteClicked}
          onGenerateColorScheme={this.handleGenerateColorScheme}
          handleAddCustomBlock={this.handleAddCustomBlock}
          handleDeleteCustomBlock={this.handleDeleteCustomBlock}
        />
        <div className="sectionsPreviewSettingsMaterials">
          <MapPreview
            getLocaleString={getLocaleString}
            coloursJSON={coloursJSON}
            selectedBlocks={selectedBlocks}
            disabledTones={disabledTones}
            optionValue_version={optionValue_version}
            optionValue_modeNBTOrMapdat={optionValue_modeNBTOrMapdat}
            optionValue_mapSize_x={optionValue_mapSize_x}
            optionValue_mapSize_y={optionValue_mapSize_y}
            optionValue_cropImage={optionValue_cropImage}
            optionValue_cropImage_zoom={optionValue_cropImage_zoom}
            optionValue_cropImage_percent_x={optionValue_cropImage_percent_x}
            optionValue_cropImage_percent_y={optionValue_cropImage_percent_y}
            optionValue_showGridOverlay={optionValue_showGridOverlay}
            optionValue_staircasing={optionValue_staircasing}
            optionValue_whereSupportBlocks={optionValue_whereSupportBlocks}
            optionValue_transparency={optionValue_transparency}
            optionValue_transparencyTolerance={optionValue_transparencyTolerance}
            optionValue_betterColour={optionValue_betterColour}
            optionValue_dithering={optionValue_dithering}
            optionValue_dithering_propagation_red={optionValue_dithering_propagation_red}
            optionValue_dithering_propagation_green={optionValue_dithering_propagation_green}
            optionValue_dithering_propagation_blue={optionValue_dithering_propagation_blue}
            optionValue_preprocessingEnabled={optionValue_preprocessingEnabled}
            preProcessingValue_brightness={preProcessingValue_brightness}
            preProcessingValue_contrast={preProcessingValue_contrast}
            preProcessingValue_saturation={preProcessingValue_saturation}
            preProcessingValue_backgroundColourSelect={preProcessingValue_backgroundColourSelect}
            preProcessingValue_backgroundColour={preProcessingValue_backgroundColour}
            optionValue_autoZoom={optionValue_autoZoom}
            uploadedImage={uploadedImage}
            onFileDialogEvent={this.onFileDialogEvent}
            onGetMapMaterials={this.handleSetMapMaterials}
            onMapPreviewWorker_begin={this.onMapPreviewWorker_begin}
          />
          <div style={{ display: "block" }}>
            <MapSettings
              getLocaleString={getLocaleString}
              coloursJSON={coloursJSON}
              optionValue_version={optionValue_version}
              onOptionChange_version={this.onOptionChange_version}
              optionValue_modeNBTOrMapdat={optionValue_modeNBTOrMapdat}
              onOptionChange_modeNBTOrMapdat={this.onOptionChange_modeNBTOrMapdat}
              optionValue_mapSize_x={optionValue_mapSize_x}
              onOptionChange_mapSize_x={this.onOptionChange_mapSize_x}
              optionValue_mapSize_y={optionValue_mapSize_y}
              onOptionChange_mapSize_y={this.onOptionChange_mapSize_y}
              optionValue_cropImage={optionValue_cropImage}
              onOptionChange_cropImage={this.onOptionChange_cropImage}
              optionValue_cropImage_zoom={optionValue_cropImage_zoom}
              onOptionChange_cropImage_zoom={this.onOptionChange_cropImage_zoom}
              optionValue_cropImage_percent_x={optionValue_cropImage_percent_x}
              onOptionChange_cropImage_percent_x={this.onOptionChange_cropImage_percent_x}
              optionValue_cropImage_percent_y={optionValue_cropImage_percent_y}
              onOptionChange_cropImage_percent_y={this.onOptionChange_cropImage_percent_y}
              optionValue_showGridOverlay={optionValue_showGridOverlay}
              onOptionChange_showGridOverlay={this.onOptionChange_showGridOverlay}
              optionValue_staircasing={optionValue_staircasing}
              onOptionChange_staircasing={this.onOptionChange_staircasing}
              optionValue_whereSupportBlocks={optionValue_whereSupportBlocks}
              onOptionChange_WhereSupportBlocks={this.onOptionChange_WhereSupportBlocks}
              optionValue_supportBlock={optionValue_supportBlock}
              setOption_SupportBlock={this.setOption_SupportBlock}
              optionValue_transparency={optionValue_transparency}
              onOptionChange_transparency={this.onOptionChange_transparency}
              optionValue_transparencyTolerance={optionValue_transparencyTolerance}
              onOptionChange_transparencyTolerance={this.onOptionChange_transparencyTolerance}
              optionValue_mapdatFilenameUseId={optionValue_mapdatFilenameUseId}
              onOptionChange_mapdatFilenameUseId={this.onOptionChange_mapdatFilenameUseId}
              optionValue_mapdatFilenameIdStart={optionValue_mapdatFilenameIdStart}
              onOptionChange_mapdatFilenameIdStart={this.onOptionChange_mapdatFilenameIdStart}
              optionValue_betterColour={optionValue_betterColour}
              onOptionChange_BetterColour={this.onOptionChange_BetterColour}
              optionValue_dithering={optionValue_dithering}
              onOptionChange_dithering={this.onOptionChange_dithering}
              optionValue_dithering_propagation_red={optionValue_dithering_propagation_red}
              onOptionChange_dithering_propagation_red={this.onOptionChange_dithering_propagation_red}
              optionValue_dithering_propagation_green={optionValue_dithering_propagation_green}
              onOptionChange_dithering_propagation_green={this.onOptionChange_dithering_propagation_green}
              optionValue_dithering_propagation_blue={optionValue_dithering_propagation_blue}
              onOptionChange_dithering_propagation_blue={this.onOptionChange_dithering_propagation_blue}
              optionValue_preprocessingEnabled={optionValue_preprocessingEnabled}
              onOptionChange_PreProcessingEnabled={this.onOptionChange_PreProcessingEnabled}
              preProcessingValue_brightness={preProcessingValue_brightness}
              onOptionChange_PreProcessingBrightness={this.onOptionChange_PreProcessingBrightness}
              preProcessingValue_contrast={preProcessingValue_contrast}
              onOptionChange_PreProcessingContrast={this.onOptionChange_PreProcessingContrast}
              preProcessingValue_saturation={preProcessingValue_saturation}
              onOptionChange_PreProcessingSaturation={this.onOptionChange_PreProcessingSaturation}
              preProcessingValue_backgroundColourSelect={preProcessingValue_backgroundColourSelect}
              onOptionChange_PreProcessingBackgroundColourSelect={this.onOptionChange_PreProcessingBackgroundColourSelect}
              preProcessingValue_backgroundColour={preProcessingValue_backgroundColour}
              onOptionChange_PreProcessingBackgroundColour={this.onOptionChange_PreProcessingBackgroundColour}
              optionValue_extras_moreStaircasingOptions={optionValue_extras_moreStaircasingOptions}
              onOptionChange_extras_moreStaircasingOptions={this.onOptionChange_extras_moreStaircasingOptions}
              optionValue_autoZoom={optionValue_autoZoom}
              onOptionChange_autoZoom={this.onOptionChange_autoZoom}
              optionValue_image2map={optionValue_image2map}
              onOptionChange_image2map={this.onOptionChange_image2map}
            />
            <GreenButtons
              getLocaleString={getLocaleString}
              coloursJSON={coloursJSON}
              selectedBlocks={selectedBlocks}
              optionValue_version={optionValue_version}
              optionValue_modeNBTOrMapdat={optionValue_modeNBTOrMapdat}
              optionValue_mapSize_x={optionValue_mapSize_x}
              optionValue_mapSize_y={optionValue_mapSize_y}
              optionValue_cropImage={optionValue_cropImage}
              optionValue_cropImage_zoom={optionValue_cropImage_zoom}
              optionValue_cropImage_percent_x={optionValue_cropImage_percent_x}
              optionValue_cropImage_percent_y={optionValue_cropImage_percent_y}
              optionValue_staircasing={optionValue_staircasing}
              optionValue_whereSupportBlocks={optionValue_whereSupportBlocks}
              optionValue_supportBlock={optionValue_supportBlock}
              optionValue_transparency={optionValue_transparency}
              optionValue_transparencyTolerance={optionValue_transparencyTolerance}
              optionValue_mapdatFilenameUseId={optionValue_mapdatFilenameUseId}
              optionValue_mapdatFilenameIdStart={optionValue_mapdatFilenameIdStart}
              optionValue_betterColour={optionValue_betterColour}
              optionValue_dithering={optionValue_dithering}
              optionValue_dithering_propagation_red={optionValue_dithering_propagation_red}
              optionValue_dithering_propagation_green={optionValue_dithering_propagation_green}
              optionValue_dithering_propagation_blue={optionValue_dithering_propagation_blue}
              optionValue_preprocessingEnabled={optionValue_preprocessingEnabled}
              preProcessingValue_brightness={preProcessingValue_brightness}
              preProcessingValue_contrast={preProcessingValue_contrast}
              preProcessingValue_saturation={preProcessingValue_saturation}
              preProcessingValue_backgroundColourSelect={preProcessingValue_backgroundColourSelect}
              preProcessingValue_backgroundColour={preProcessingValue_backgroundColour}
              uploadedImage={uploadedImage}
              uploadedImage_baseFilename={uploadedImage_baseFilename}
              currentMaterialsData={currentMaterialsData}
              mapPreviewWorker_inProgress={mapPreviewWorker_inProgress}
              downloadBlobFile={this.downloadBlobFile}
              onGetViewOnlineNBT={this.onGetViewOnlineNBT}
            />
          </div>
          {optionValue_modeNBTOrMapdat === MapModes.SCHEMATIC_NBT.uniqueId ? (
            <Materials
              getLocaleString={getLocaleString}
              coloursJSON={coloursJSON}
              optionValue_version={optionValue_version}
              optionValue_supportBlock={optionValue_supportBlock}
              currentMaterialsData={currentMaterialsData}
              onChangeColourSetBlock={this.handleChangeColourSetBlock}
              onFileDialogEvent={this.onFileDialogEvent}
            />
          ) : null}
        </div>
        {viewOnline_NBT !== null &&
          (viewOnline_3D ? (
            <ViewOnline3D
              getLocaleString={getLocaleString}
              coloursJSON={coloursJSON}
              optionValue_version={optionValue_version}
              optionValue_mapSize_x={optionValue_mapSize_x}
              optionValue_mapSize_y={optionValue_mapSize_y}
              viewOnline_NBT={viewOnline_NBT}
              handleViewOnline3DEscape={this.handleViewOnline3DEscape}
            />
          ) : (
            <ViewOnline2D
              getLocaleString={getLocaleString}
              coloursJSON={coloursJSON}
              optionValue_version={optionValue_version}
              optionValue_mapSize_x={optionValue_mapSize_x}
              optionValue_mapSize_y={optionValue_mapSize_y}
              optionValue_staircasing={optionValue_staircasing}
              viewOnline_NBT={viewOnline_NBT}
              onGetViewOnlineNBT={this.onGetViewOnlineNBT}
              onChooseViewOnline3D={this.onChooseViewOnline3D}
            />
          ))}
        {showPaletteFormatModal && (
          <div className="palette-format-modal-overlay" onClick={this.closePaletteFormatModal}>
            <div className="palette-format-modal" onClick={(e) => e.stopPropagation()}>
              <div className="palette-format-modal-header">
                <h3>Choose palette format</h3>
                <button className="palette-format-modal-close" onClick={this.closePaletteFormatModal}>×</button>
              </div>
              <div className="palette-format-modal-body">
                <button className="palette-format-option" onClick={this.generatePaintNetPalette}>
                  <div className="palette-format-icon">🎨</div>
                  <div className="palette-format-info">
                    <div className="palette-format-name">paint.net</div>
                    <div className="palette-format-ext">.txt</div>
                  </div>
                </button>
                <button className="palette-format-option" onClick={this.generateGIMPPalette}>
                  <div className="palette-format-icon">🖼️</div>
                  <div className="palette-format-info">
                    <div className="palette-format-name">GIMP</div>
                    <div className="palette-format-ext">.gpl</div>
                  </div>
                </button>
                <button className="palette-format-option" onClick={this.generatePhotoshopPalette}>
                  <div className="palette-format-icon">✨</div>
                  <div className="palette-format-info">
                    <div className="palette-format-name">Photoshop</div>
                    <div className="palette-format-ext">.aco</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default MapartControllerWrapper;
