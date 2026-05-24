import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import Icon from '../common/FeatherIcon';
import {colors} from '../../theme';
import {Listing} from '../../types/marketplace';

interface Props {
  listing: Pick<Listing, 'imageURL' | 'status' | 'title'>;
  size?: number;
}

const ListingMedia = ({listing, size = 76}: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const sold = listing.status === 'sold';
  const iconName = listing.title.toLowerCase().includes('camera')
    ? 'camera'
    : 'shopping-bag';
  const imageAvailable = Boolean(listing.imageURL) && !imageFailed;

  return (
    <View style={[styles.frame, {width: size, height: size}]}>
      {imageAvailable ? (
        <Image
          source={{uri: listing.imageURL as string}}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Icon
          name={iconName}
          size={Math.max(22, Math.round(size * 0.36))}
          color={sold ? colors.text.tertiary : colors.gold.light}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    flexShrink: 0,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ListingMedia;
