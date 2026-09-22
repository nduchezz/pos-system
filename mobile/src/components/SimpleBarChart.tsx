import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatValue?: (v: number) => string;
}

const { width } = Dimensions.get('window');

const SimpleBarChart: React.FC<Props> = ({ data, height = 140, formatValue }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartWidth = width - SIZES.md * 4;
  const barCount = data.length;
  const barWidth = Math.max(8, (chartWidth - barCount * 4) / barCount);

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {data.map((item, idx) => {
          const h = (item.value / maxValue) * (height - 30);
          return (
            <View key={idx} style={styles.barWrap}>
              <Text style={styles.barValue}>
                {item.value > 0
                  ? formatValue
                    ? formatValue(item.value)
                    : item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}k`
                    : item.value.toFixed(0)
                  : ''}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(2, h),
                    width: barWidth,
                    backgroundColor: item.value > 0 ? COLORS.primary : COLORS.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {data.map((item, idx) => (
          <View key={idx} style={[styles.labelWrap, { width: barWidth + 4 }]}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: SIZES.sm },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.sm,
  },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderRadius: 3, marginTop: 4 },
  barValue: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.sm,
    marginTop: 6,
  },
  labelWrap: { alignItems: 'center' },
  label: { fontSize: 9, color: COLORS.textSecondary },
});

export default SimpleBarChart;
