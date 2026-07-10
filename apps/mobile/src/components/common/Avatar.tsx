import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {colors, typography} from '../../theme';
import {FinancialStatus} from '../../types/user';
import StatusDot from './StatusDot';

interface Props {
  initials: string;
  photoURL?: string | null;
  size?: number;
  statusDot?: FinancialStatus | null;
}

const Avatar = ({initials, photoURL, size = 38, statusDot}: Props) => {
  const fontSize = Math.round(size * 0.37);

  return (
    <View style={{width: size, height: size}}>
      {photoURL ? (
        <Image
          source={{uri: photoURL}}
          cachePolicy="memory-disk"
          transition={120}
          style={[styles.image, {width: size, height: size, borderRadius: size / 2}]}
        />
      ) : (
        <View style={[styles.initials, {width: size, height: size, borderRadius: size / 2}]}>
          <Text style={[styles.text, {fontSize}]}>{initials.toUpperCase()}</Text>
        </View>
      )}
      {statusDot && <StatusDot status={statusDot} style={styles.dot} />}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {borderWidth: 1.5, borderColor: colors.border.subtle},
  initials: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
  dot: {position: 'absolute', bottom: 0, right: 0},
});

export default Avatar;
