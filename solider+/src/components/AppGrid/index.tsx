import React from 'react';
import { View, Image, Text } from '@tarojs/components';
import './index.scss';

// 定义数据项接口
export interface GridItem {
  image: string;
  text?: string;
  [key: string]: any;
}

// 定义组件 Props 接口
interface CustomGridProps {
  data: GridItem[];
  column?: number;           // 列数，默认 3
  imageWidth?: string | number; // 图片宽度 (如 '40px', 40)
  imageHeight?: string | number;// 图片高度
  fontSize?: string | number;   // 【新增】字体大小 (如 '24px', 24, '28rpx')
  textColor?: string;           // 【新增】字体颜色 (如 '#333', 'red')
  gap?: string | number;        // 格子间距
  onClick?: (item: GridItem, index: number) => void;
  className?: string;
}

const AppGrid: React.FC<CustomGridProps> = ({
  data = [],
  column = 4,
  imageWidth = "88rpx",
  imageHeight = "88rpx",
  fontSize = "16rpx",       // 设置大字体
  textColor = '#333333',  // 默认字体颜色
  gap = '2rpx',
  onClick,
  className = '',
}) => {
  const itemWidth = `${100 / column}%`;

  const handleClick = (item: GridItem, index: number) => {
    if (onClick) {
      onClick(item, index);
    }
  };

  return (
    <View className={`custom-grid ${className}`} style={{ padding: gap }}>
      {data.map((item, index) => (
        <View
          key={index}
          className="custom-grid__item"
          style={{
            width: itemWidth,
            padding: gap ? `${gap}` : '0',
            boxSizing: 'border-box',
          }}
          onClick={() => handleClick(item, index)}
        >
          <View className="custom-grid__image-wrapper">
            <Image
              src={item.image}
              mode="aspectFill"
              style={{
                width: imageWidth,
                height: imageHeight,
                display: 'block',
              }}
            />
          </View>

          {item.value && (
            <Text
              className="custom-grid__text"
              style={{
                fontSize: fontSize,   // 【动态绑定】字体大小
                color: textColor,     // 【动态绑定】字体颜色
              }}
            >
              {item.value}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

export default AppGrid;