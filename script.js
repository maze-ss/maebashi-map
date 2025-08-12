// PMTiles プロトコル登録
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// マップ初期化
const map = new maplibregl.Map({
  container: 'map',
  center: [139.06343, 36.38953],
  zoom: 15.1,//初期ズームレベル
  style: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      // 背景地図 淡色地図
      pale: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '地理院タイル（淡色）',
        maxzoom: 18,
      },
      // 背景地図 シームレス写真
      seamlessphoto: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: '地理院シームレス写真',
        maxzoom: 18,
      },
      // 地番図 PMTiles
      chibanzu: {
        type: 'vector',
        url: 'pmtiles://./tiles/chibanzu_maebashi.pmtiles',
      },
    },
    layers: [
      // 背景地図 淡色地図
      {
        id: 'pale-layer',
        type: 'raster',
        source: 'pale',
        minzoom: 0,
        maxzoom: 18.0,
      },
      // 背景地図 シームレス写真（ズーム16.5から）
      {
        id: 'seamlessphoto-layer',
        type: 'raster',
        source: 'seamlessphoto',
        minzoom: 16.5,
        maxzoom: 20.1,
        paint: {
          'raster-opacity': [
            'interpolate', ['linear'], ['zoom'],
            16.5, 0, // ズームレベル制御 透過度0
            17.5, 0.6 // ズームレベル制御 透過度0.6
          ]
        }
      },
      // 地番図 PMTiles - 枠線（最上位）
      {
        id: 'chibanzu-line',
        type: 'line',
        source: 'chibanzu',
        'source-layer': 'chibanzu_maebashi-layer',
        minzoom: 15,
        paint: {
          'line-color': '#d34eed',
          'line-width': 1.6,
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            16.5, 1
          ]
        }
      },
      // 地番図 PMTiles - テキスト（最上位）
      {
        id: 'chibanzu-text',
        type: 'symbol',
        source: 'chibanzu',
        'source-layer': 'chibanzu_maebashi-layer',
        minzoom: 17.8, // 地番と文字の表示タイミングを調整
        layout: {
          'text-field': ['get', '表示名称'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 18,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#d34eed',
          'text-halo-color': 'rgba(255, 255, 255, 0.6)',
          'text-halo-width': 4
        }
      }
    ]
  }
});

// ズームレベル表示更新
const zoomDisplay = document.getElementById('zoom-display');
map.on('zoom', () => {
  zoomDisplay.textContent = `ズームレベル : ${map.getZoom().toFixed(1)}`;
});

map.addControl(new maplibregl.NavigationControl({
  showCompass: true,
  showZoom: true,
  visualizePitch: true
}), 'top-right');

// GeoJSON読込み - 町境界
map.on('load', () => {
  map.addSource('maebashi-border', {
    type: 'geojson',
    data: './maebashi_border.geojson'
  });

  map.addLayer({
    id: 'maebashi-border-line',
    type: 'line',
    source: 'maebashi-border',
    maxzoom: 18,
    paint: {
      'line-color': '#5c5ee6',
      'line-width': 2,
      'line-opacity': [
        'interpolate', ['linear'], ['zoom'],
        16.8, 1, // ズームレベル制御 透過度1
        17.8, 0  // ズームレベル制御 17.8以降透明
      ]
    }
  });

  // 町境界テキスト表示（ズームレベル制御）
  map.addLayer({
    id: 'maebashi-border-text',
    type: 'symbol',
    source: 'maebashi-border',
    minzoom: 10,
    maxzoom: 14,
    layout: {
      'text-field': ['get', 'S_NAME'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 16,
      'text-anchor': 'center'
    },
    paint: {
      'text-color': '#5c5ee6',
      'text-halo-color': 'rgba(255, 255, 255, 0.8)',
      'text-halo-width': 2
    }
  });

  // 町境界 クリック用fill（透明fill）
  map.addLayer({
    id: 'maebashi-border-fill',
    type: 'fill',
    source: 'maebashi-border',
    minzoom: 10,
    maxzoom: 14,
    paint: {
      'fill-color': 'transparent',
      'fill-opacity': 0
    }
  });

  // クリックされたfillのハイライト表示
  map.addLayer({
    id: 'maebashi-border-selected',
    type: 'fill',
    source: 'maebashi-border',
    minzoom: 10,
    maxzoom: 14,
    paint: {
      'fill-color': '#edad79', // 選択時のハイライト色
      'fill-opacity': 0.3,
      'fill-outline-color': '#5c5ee6'
    },
    filter: ['==', 'S_NAME', ''] // 初期は未選択状態
  });
});

// 背景地図の非表示制御
document.getElementById('background-toggle').addEventListener('change', (e) => {
  const opacity = e.target.checked ? 1 : 0;
    // 淡色地図の透過度制御
  map.setPaintProperty('pale-layer', 'raster-opacity', opacity);
    // 航空写真の透過度制御
  if (e.target.checked) {
    // ONの場合：元の透過度設定を復元
    map.setPaintProperty('seamlessphoto-layer', 'raster-opacity', [
      'interpolate', ['linear'], ['zoom'],
      16.5, 0,
      17.5, 0.6
    ]);
  } else {
    // OFFの場合：完全透明
    map.setPaintProperty('seamlessphoto-layer', 'raster-opacity', 0);
  }
});

// 町境界（透明fill）クリック時のポップアップ表示（ズーム10-14）
let selectedPolygon = null; // 選択されたポリゴンを管理

map.on('click', 'maebashi-border-fill', (e) => {
  const properties = e.features[0].properties;
  const polygonName = properties.S_NAME;
  
  // 選択されたポリゴンをハイライト
  selectedPolygon = polygonName;
  map.setFilter('maebashi-border-selected', ['==', 'S_NAME', polygonName]);
  
  // 表示したい属性を選択（必要に応じて変更）
  const displayFields = {
    'S_NAME': '地区名',
    'AREA': '面積',
    '総人口': '人口',
    '世帯数': '世帯数',
    '男性': '男性', 
    '女性': '女性',
  };
  
  // 属性情報をHTMLで整形
  let popupContent = '<div style="font-family: sans-serif; font-size: 12px;">';
  popupContent += '<h3 style="margin: 0 0 10px 0;">地区情報</h3>';
  
  for (const [key, label] of Object.entries(displayFields)) {
    const value = properties[key];
    if (value !== null && value !== '' && value !== undefined) {
      popupContent += `<div style="margin-bottom: 5px;"><strong>${label}:</strong> ${value}</div>`;
    }
  }
  
  popupContent += '</div>';
  
  // ポップアップを表示
  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(popupContent)
    .addTo(map);
});

// ポリゴン選択の解除
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, { 
    layers: ['maebashi-border-fill'] 
  });
  
  // クリックした場所に町境界がない場合、選択を解除
  if (features.length === 0 && selectedPolygon) {
    selectedPolygon = null;
    map.setFilter('maebashi-border-selected', ['==', 'S_NAME', '']);
  }
});

// マウスカーソルをポインターに変更（透明fill用）
map.on('mouseenter', 'maebashi-border-fill', () => {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'maebashi-border-fill', () => {
  map.getCanvas().style.cursor = '';
});
