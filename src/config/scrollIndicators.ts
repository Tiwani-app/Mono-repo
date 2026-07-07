import { FlatList, ScrollView, SectionList, VirtualizedList } from "react-native";

const hideScrollIndicators = (Component: unknown) => {
  const ScrollComponent = Component as {
    defaultProps?: Record<string, unknown>;
  };

  ScrollComponent.defaultProps = {
    ...ScrollComponent.defaultProps,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
  };
};

[ScrollView, FlatList, SectionList, VirtualizedList].forEach(hideScrollIndicators);
