import React from 'react';
import {Feather} from '@expo/vector-icons';

interface Props {
  name: string;
  size: number;
  color: string;
}

const FeatherIcon = ({name, size, color}: Props) => (
  <Feather name={name as keyof typeof Feather.glyphMap} size={size} color={color} />
);

export default FeatherIcon;
