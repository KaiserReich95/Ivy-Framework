import React from 'react';
import ReactECharts from 'echarts-for-react';
import { getHeight, getWidth } from '@/lib/styles';
import {
  generateDataProps,
  generateEChartGrid,
  generateEChartLegend,
  generateSeries,
  generateTooltip,
  generateXAxis,
  generateYAxis,
  getColors,
  getTransformValueFn,
} from './sharedUtils';
import { LineChartWidgetProps } from './chartTypes';

const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  data,
  width,
  height,
  lines,
  cartesianGrid,
  xAxis,
  yAxis,
  tooltip,
  legend,
  referenceLines,
  referenceAreas,
  referenceDots,
  colorScheme,
}) => {
  const styles: React.CSSProperties = {
    ...getWidth(width),
    ...getHeight(height),
    minHeight: 300,
  };

  const colors = getColors(colorScheme);
  const { categories, valueKeys } = generateDataProps(data);
  const { transform, largeSpread, minValue, maxValue } =
    getTransformValueFn(data);

  const option = {
    grid: generateEChartGrid(cartesianGrid),
    xAxis: generateXAxis(categories as string[], xAxis),
    yAxis: generateYAxis(largeSpread, transform, minValue, maxValue, yAxis),
    tooltip: generateTooltip(tooltip, 'shadow'),
    legend: generateEChartLegend(legend),

    color: colors,
    series: generateSeries(
      data,
      valueKeys,
      lines,
      transform,
      referenceDots,
      referenceLines,
      referenceAreas
    ),
  };

  return <ReactECharts option={option} style={styles} />;
};

export default LineChartWidget;
