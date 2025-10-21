import React from 'react';
import { getHeight, getWidth } from '@/lib/styles';
import ReactECharts from 'echarts-for-react';
import { getColors } from './sharedUtils';
import { ChartType, PieChartWidgetProps } from './chartTypes';
import { generateDataProps } from './sharedUtils';

const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  data,
  width,
  height,
  pies,
  tooltip,
  legend,
  colorScheme,
  total,
}) => {
  const styles: React.CSSProperties = {
    ...getWidth(width),
    ...getHeight(height),
    minHeight: 300,
  };

  const { valueKeys } = generateDataProps(data);

  const colors = getColors(colorScheme);

  const newData = data.map(d => {
    return { value: d.measure, name: d.dimension as string };
  });

  const series = valueKeys.map(key => {
    const pieProperties = pies?.find(a => a.dataKey.toLowerCase() === key);

    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      type: ChartType.Pie,
      radius: [
        pieProperties?.innerRadius ?? '40%',
        pieProperties?.outerRadius ?? '70%',
      ],
      center: [pieProperties?.cx ?? '50%', pieProperties?.cy ?? '50%'],
      startAngle: pieProperties?.startAngle ?? 90,
      endAngle: pieProperties?.endAngle ?? 450,
      animation: pieProperties?.animated ?? true,
      avoidLabelOverlap: false,
      label: {
        show: false,
        position: 'center',
      },
      emphasis: {
        disabled: false,
        scale: true,
        scaleSize: 5,
        focus: 'none',
        label: {
          show: true,
          fontSize: 40,
          fontWeight: 'bold',
        },
      },
      labelLine: {
        show: false,
      },
      itemStyle: {
        color: pieProperties?.fill ?? undefined,
        opacity: pieProperties?.fillOpacity ?? undefined,
        borderColor: pieProperties?.stroke ?? undefined,
        borderWidth: pieProperties?.strokeWidth ?? undefined,
      },
      data: newData,
    };
  });

  const option = {
    color: colors,
    ...(legend && {
      legend: {
        orient:
          legend.layout?.toLowerCase() === 'vertical'
            ? 'vertical'
            : 'horizontal',
        left:
          legend.align?.toLowerCase() === 'left'
            ? 'left'
            : legend.align?.toLowerCase() === 'right'
              ? 'right'
              : 'center',
        top:
          legend.verticalAlign?.toLowerCase() === 'top'
            ? 'top'
            : legend.verticalAlign?.toLowerCase() === 'middle'
              ? 'middle'
              : 'bottom',
        icon: legend.iconType ?? 'circle',
        itemWidth: legend.iconSize ?? 12,
        itemHeight: legend.iconSize ?? 12,
        type: 'scroll',
      },
    }),
    textStyle: {
      color: 'var(--text-primary, #333)',
      fontSize: 12,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      animated: tooltip?.animated ?? true,
      textStyle: {
        fontSize: 12,
        fontWeight: 'normal',
      },
    },
    series: series,
  };

  return (
    <div>
      {total && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span>{total.label}</span>
          <span>{total.formattedValue}</span>
        </div>
      )}
      <ReactECharts option={option} style={styles} />
    </div>
  );
};

export default PieChartWidget;
