/**
 * @file components/fileBrowser/FileIcons.jsx
 * @description 文件浏览器图标组件：通用 Icon + 按扩展名匹配文件类型图标。
 * @module components/fileBrowser/FileIcons
 */

import FolderIcon from '../../assets/icons/editor/folder.svg?react';
import FileIcon from '../../assets/icons/editor/file.svg?react';
import ImageFileIcon from '../../assets/icons/misc/image-file.svg?react';
import AudioIcon from '../../assets/icons/viewport/audio.svg?react';
import VideoIcon from '../../assets/icons/viewport/video.svg?react';
import BookIcon from '../../assets/icons/editor/book.svg?react';
import DocumentIcon from '../../assets/icons/editor/document.svg?react';
import ListIcon from '../../assets/icons/tools/list.svg?react';
import CodeIcon from '../../assets/icons/misc/code.svg?react';
import BoxIcon from '../../assets/icons/tools/box.svg?react';
import PlayCircleIcon from '../../assets/icons/viewport/play-circle.svg?react';
import ModelIcon from '../../assets/icons/tools/model.svg?react';

/**
 * 通用图标组件
 * @param {Object} props
 * @param {string} props.src - SVG 资源地址
 * @param {number} [props.size=16]
 * @param {string} [props.className='']
 */
function Icon({ src, size = 16, className = '' }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`icon ${className}`}
      style={{
        filter: 'var(--icon-filter, none)',
        opacity: 'var(--icon-opacity, 1)',
      }}
    />
  );
}

/**
 * 按文件扩展名匹配图标。
 * @param {string} filename - 文件名
 * @returns {Function} 匹配到的 SVG React 组件
 */
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();

  const iconMap = {
    jpg: ImageFileIcon,
    jpeg: ImageFileIcon,
    png: ImageFileIcon,
    gif: ImageFileIcon,
    bmp: ImageFileIcon,
    svg: ImageFileIcon,
    mp3: AudioIcon,
    wav: AudioIcon,
    ogg: AudioIcon,
    flac: AudioIcon,
    mp4: VideoIcon,
    avi: VideoIcon,
    mkv: VideoIcon,
    mov: VideoIcon,
    webm: VideoIcon,
    pdf: BookIcon,
    doc: DocumentIcon,
    docx: DocumentIcon,
    xls: DocumentIcon,
    xlsx: DocumentIcon,
    ppt: DocumentIcon,
    pptx: DocumentIcon,
    zip: BoxIcon,
    rar: BoxIcon,
    '7z': BoxIcon,
    tar: BoxIcon,
    gz: BoxIcon,
    exe: PlayCircleIcon,
    msi: PlayCircleIcon,
    app: PlayCircleIcon,
    dmg: PlayCircleIcon,
    js: CodeIcon,
    ts: CodeIcon,
    jsx: CodeIcon,
    tsx: CodeIcon,
    py: CodeIcon,
    java: CodeIcon,
    cpp: CodeIcon,
    c: CodeIcon,
    json: ListIcon,
    xml: ListIcon,
    yaml: ListIcon,
    yml: ListIcon,
    toml: ListIcon,
    md: DocumentIcon,
    txt: DocumentIcon,
    rtf: DocumentIcon,
    html: CodeIcon,
    css: CodeIcon,
    scss: CodeIcon,
    gltf: ModelIcon,
    glb: ModelIcon,
    obj: ModelIcon,
    fbx: ModelIcon,
    astra: PlayCircleIcon,
    a3d: PlayCircleIcon,
  };

  return iconMap[ext] || FileIcon;
}

export { Icon, getFileIcon, FolderIcon };