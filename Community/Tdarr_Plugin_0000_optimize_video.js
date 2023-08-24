/* eslint-disable max-len */
const details = () => ({
  id: '-eIDCUviI',
  Stage: 'Pre-processing',
  Name: 'Optimize Video',
  Type: 'Video',
  Operation: 'Transcode',
  Description: 'Optimize video for playback on the web.',
  Version: '1.0',
  Tags: 'video,ffmpeg,vaapi',
  Inputs: [
    {
      name: 'threshold_bitrate',
      type: 'string',
      defaultValue: '25',
      inputUI: {
        type: 'text',
      },
      tooltip: 'If the video bitrate is above this value, it will be transcoded. (Mbps)',
    },
    {
      name: 'quality',
      type: 'string',
      defaultValue: '22',
      inputUI: {
        type: 'text',
      },
      tooltip: 'The CRF value to use when transcoding.',
    },
    {
      name: 'speed',
      type: 'string',
      defaultValue: 'medium',
      inputUI: {
        type: 'dropdown',
        options: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'],
      },
      tooltip: 'The speed preset to use when transcoding.',
    }],
});

const plugin = (file, librarySettings, inputs) => {
  const lib = require('../methods/lib')();
  const inputVars = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: false,
    preset: '',
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: '',
    container: 'mp4',
  };

  let videoBitrate = 0;
  file.mediaInfo.track.forEach((track) => {
    if (track['@type'] === 'Video') {
      videoBitrate = Number(track.BitRate || track.BitRate_Maximum);
    }
  });

  response.infoLog += `  Video bitrate is ${videoBitrate}.\n`;

  if (videoBitrate === 0) {
    response.infoLog += '☒ Could not determine video bitrate.\n';
    return response;
  }

  let isHevc = false;
  file.ffProbeData.streams.forEach((stream) => {
    if (stream.codec_name === 'hevc') isHevc = true;
  });

  const thresholdBitrate = Number(inputVars.threshold_bitrate) * 1000000;
  if (videoBitrate < thresholdBitrate + (thresholdBitrate * 0.03) && isHevc) {
    response.infoLog += `☑ Video bitrate is below threshold of ${inputs.threshold_bitrate} and HEVC, no processing required.\n`;
    return response;
  }

  const quality = Number(inputVars.crf);

  response.processFile = true;
  // -maxrate:v ${maxBitrate}M -bufsize:v ${Math.floor(maxBitrate * 3)}M
  const qsv = '-hwaccel qsv -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format qsv';
  response.preset = `${qsv},-map 0:v? -map 0:a? -map 0:s? -map 0:d? -map 0:t? -c copy -c:v:0 hevc_qsv -global_quality ${quality} -movflags +faststart -strict -2`;

  response.infoLog += `☒ Video bitrate is above threshold of ${inputs.threshold_bitrate} or video is not HEVC, transcoding to HEVC.\n`;

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
