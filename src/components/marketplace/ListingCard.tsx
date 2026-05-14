import React from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import Badge from '../common/Badge';
import GoldButton from '../common/GoldButton';
import {colors, spacing, typography} from '../../theme';
import {Listing} from '../../types/marketplace';
import {formatCurrency} from '../../utils/formatCurrency';

interface Props {
  listing: Listing;
}

const ListingCard = ({listing}: Props) => {
  const sold = listing.status === 'sold';

  const handleEnquire = () => {
    const phone = '2348034567890';
    const message = encodeURIComponent(
      `Hi, I'm interested in "${listing.title}" listed on Tiwani for ${formatCurrency(listing.price)}. Is it still available?`,
    );
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${message}`;
    Linking.canOpenURL(whatsappUrl).then(supported => {
      Linking.openURL(supported ? whatsappUrl : `sms:+${phone}?body=${message}`);
    });
  };

  return (
    <View style={[styles.card, sold && styles.sold]}>
      <View style={styles.imageFallback}>
        <Text style={styles.imageText}>T</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{listing.title}</Text>
          <Badge
            label={listing.status.toUpperCase()}
            color={sold ? colors.text.tertiary : colors.status.success}
          />
        </View>
        <Text style={styles.description}>{listing.description}</Text>
        <Text style={[styles.price, sold && styles.soldPrice]}>{formatCurrency(listing.price)}</Text>
        <GoldButton
          label={sold ? 'Sold' : 'Enquire'}
          onPress={handleEnquire}
          disabled={sold}
          fullWidth
          size="sm"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sold: {opacity: 0.65},
  imageFallback: {
    height: 120,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
  },
  imageText: {fontSize: typography.size.xxxl, color: colors.gold.light, fontWeight: typography.weight.black},
  content: {gap: spacing.md},
  topRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  title: {flex: 1, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary},
  description: {fontSize: typography.size.base, color: colors.text.secondary, lineHeight: 20},
  price: {fontSize: typography.size.xl, fontWeight: typography.weight.black, color: colors.gold.light},
  soldPrice: {color: colors.text.tertiary},
});

export default ListingCard;
