import fs from 'fs'

// 定义SFO文件的头部结构
class Header {
  constructor(buffer) {
    this.magic = buffer.readUInt32LE(0); // 通常是 'PSF'
    this.version = buffer.readUInt32LE(4); // 通常是 0x00000101
    this.keyTableStart = buffer.readUInt32LE(8); // key_table的起始位置
    this.dataTableStart = buffer.readUInt32LE(12); // data_table的起始位置
    this.indexTableEntries = buffer.readUInt32LE(16); // index_table的条目数量
  }
}

// 定义索引表条目结构
class IndexTableEntry {
  constructor(buffer, baseOffset) {
    this.keyTableOffset = buffer.readUInt16LE(baseOffset);
    this.paramFmt = buffer.readUInt16LE(baseOffset + 2);
    this.paramLen = buffer.readUInt32LE(baseOffset + 4);
    this.paramMaxLen = buffer.readUInt32LE(baseOffset + 8);
    this.dataTableOffset = buffer.readUInt32LE(baseOffset + 12);
  }
}

// SFO解析器类
export class SFOParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = fs.readFileSync(filePath);
  }

  // 解析SFO文件
  parse() {
    const header = new Header(this.data);
    const indexTableEntries = [];
    const values = {};

    // 读取索引表
    for (let i = 0; i < header.indexTableEntries; i++) {
      const indexEntryOffset = 20 + i * 16; // Header后立即开始
      const entry = new IndexTableEntry(this.data, indexEntryOffset);
      indexTableEntries.push(entry);

      // 根据索引表项读取数据
      const key = this.readString(this.data, header.keyTableStart + entry.keyTableOffset, 8);
      let value = null;
      switch (entry.paramFmt) {
        case 0x0404: // 32位无符号整数
          value = this.data.readUInt32LE(header.dataTableStart + entry.dataTableOffset);
          break;
        case 0x0004: // 特殊格式的UTF-8字符串
        case 0x0204: // 常规UTF-8字符串
          value = this.readString(this.data, header.dataTableStart + entry.dataTableOffset, entry.paramMaxLen);
          break;
        default:
          throw new Error('Unsupported param format');
      }
      values[key] = value;
    }

    return { header, indexTableEntries, values };
  }

  readString(buffer, offset) {
    let str = '';
    let i = 0;
    while (true) {
      const charCode = buffer.readUInt8(offset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
      i++;
    }
    return str;
  }

  // 读取字符串
  readString(buffer, offset, maxLength) {
    let str = '';
    for (let i = 0; i < maxLength; i++) {
      const charCode = buffer.readUInt8(offset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str;
  }

  // 获取特定键的值
  getValue(key) {
    const { values } = this.parse();
    return values[key];
  }
}

// module.exports = { SFOParser };