// Components
export { Action } from "./components/Action";
export type { ActionProps } from "./components/Action";

export {
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  CheckboxGroup,
  RadioGroup,
  Switch,
  Slider,
  MultiSwitch,
  DatePicker,
} from "./components/inputs";
export type {
  InputBaseProps,
  InputOption,
  InputOptionGroup,
  AffixPosition,
  InputAffixProps,
  FieldProps,
  InputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  CheckboxGroupProps,
  RadioGroupProps,
  SwitchProps,
  SliderProps,
  MultiSwitchProps,
  DatePickerProps,
} from "./components/inputs";

export { Carousel, useCarousel } from "./components/Carousel";
export type {
  CarouselProps,
  CarouselSlideProps,
  CarouselControlsProps,
  CarouselStepsProps,
  CarouselPanelsProps,
  CarouselContextValue,
  CarouselVariant,
} from "./components/Carousel";

export { ColorPicker } from "./components/ColorPicker";
export type { ColorPickerProps } from "./components/ColorPicker";

export { Emoji } from "./components/Emoji";
export type { EmojiProps } from "./components/Emoji";

export { EmojiSelect } from "./components/EmojiSelect";
export type { EmojiSelectProps } from "./components/EmojiSelect";

export { Table } from "./components/Table";
export type {
  TableProps,
  TableHeadProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableColumnProps,
  TablePaginationProps,
  TableSearchProps,
  TableTrayProps,
  TableRowTrayProps,
} from "./components/Table";

// Phase 2: Static Display Components
export { Portal } from "./components/Portal";
export type { PortalProps } from "./components/Portal";

export { Heading } from "./components/Heading";
export type { HeadingProps } from "./components/Heading";

export { Text } from "./components/Text";
export type { TextProps } from "./components/Text";

export { Separator } from "./components/Separator";
export type { SeparatorProps } from "./components/Separator";

export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";

export { Icon, registerIconSet, configureIcons } from "./components/Icon";
export type { IconProps, IconSet } from "./components/Icon";

export { Avatar } from "./components/Avatar";
export type { AvatarProps } from "./components/Avatar";

export { Skeleton } from "./components/Skeleton";
export type { SkeletonProps } from "./components/Skeleton";

export { Progress } from "./components/Progress";
export type { ProgressProps } from "./components/Progress";

export { Brand } from "./components/Brand";
export type { BrandProps } from "./components/Brand";

export { Profile } from "./components/Profile";
export type { ProfileProps } from "./components/Profile";

export { Card } from "./components/Card";
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
} from "./components/Card";

export { Callout } from "./components/Callout";
export type { CalloutProps } from "./components/Callout";

export { Timeline } from "./components/Timeline";
export type { TimelineProps, TimelineItemProps, TimelineBlockProps, TimelineOrientation } from "./components/Timeline";

// Phase 3: Overlay & Floating Components
export { Tooltip } from "./components/Tooltip";
export type { TooltipProps } from "./components/Tooltip";

export { Popover, usePopover } from "./components/Popover";
export type {
  PopoverProps,
  PopoverTriggerProps,
  PopoverContentProps,
  PopoverContextValue,
} from "./components/Popover";

export { Dropdown, useDropdown } from "./components/Dropdown";
export type {
  DropdownProps,
  DropdownTriggerProps,
  DropdownItemsProps,
  DropdownItemProps,
  DropdownSeparatorProps,
  DropdownContextValue,
} from "./components/Dropdown";

export { ContextMenu, useContextMenu } from "./components/ContextMenu";
export type {
  ContextMenuProps,
  ContextMenuTriggerProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuSeparatorProps,
  ContextMenuContextValue,
} from "./components/ContextMenu";

export { Modal, useModal } from "./components/Modal";
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalContextValue,
} from "./components/Modal";

export { Toast, useToast } from "./components/Toast";
export type {
  ToastData,
  ToastVariant,
  ToastPosition,
  ToastProviderProps,
  ToastContextValue,
} from "./components/Toast";

export { Command, useCommand } from "./components/Command";
export type {
  CommandProps,
  CommandInputProps,
  CommandListProps,
  CommandItemProps,
  CommandGroupProps,
  CommandEmptyProps,
  CommandContextValue,
} from "./components/Command";

// Phase 4: Navigation & Layout Components
export { Tabs, useTabs } from "./components/Tabs";
export type {
  TabsProps,
  TabsListProps,
  TabsTabProps,
  TabsPanelsProps,
  TabsPanelProps,
  TabsVariant,
  TabsContextValue,
} from "./components/Tabs";

export { Accordion, useAccordion } from "./components/Accordion";
export type {
  AccordionProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
  AccordionContextValue,
} from "./components/Accordion";

export { Breadcrumbs } from "./components/Breadcrumbs";
export type {
  BreadcrumbsProps,
  BreadcrumbsItemProps,
} from "./components/Breadcrumbs";

export { Navbar, useNavbar } from "./components/Navbar";
export type {
  NavbarProps,
  NavbarBrandProps,
  NavbarItemsProps,
  NavbarItemProps,
  NavbarToggleProps,
  NavbarContextValue,
} from "./components/Navbar";

export { Pagination } from "./components/Pagination";
export type { PaginationProps } from "./components/Pagination";

// Phase 5: Advanced Input Components
export { Autocomplete } from "./components/Autocomplete";
export type {
  AutocompleteProps,
  AutocompleteOption,
} from "./components/Autocomplete";

export { Pillbox } from "./components/Pillbox";
export type { PillboxProps } from "./components/Pillbox";

export { OtpInput } from "./components/OtpInput";
export type { OtpInputProps } from "./components/OtpInput";

export { FileUpload, useFileUpload } from "./components/FileUpload";
export type {
  FileUploadProps,
  FileUploadDropzoneProps,
  FileUploadListProps,
  FileUploadContextValue,
} from "./components/FileUpload";

export { TimePicker } from "./components/TimePicker";
export type { TimePickerProps } from "./components/TimePicker";

export { Calendar } from "./components/Calendar";
export type {
  CalendarProps,
  CalendarMode,
  DateRange,
} from "./components/Calendar";

// Phase 6: Rich Content Components
export { Composer } from "./components/Composer";
export type { ComposerProps } from "./components/Composer";

export { Chart } from "./components/Chart";
export type {
  ChartBarProps,
  ChartBarData,
  ChartDonutProps,
  ChartDonutData,
  ChartSeries,
  ChartCommonProps,
  ChartLineProps,
  ChartAreaProps,
  ChartPieData,
  ChartPieProps,
  ChartSparklineProps,
  ChartHorizontalBarProps,
  ChartStackedBarProps,
} from "./components/Chart";

export { Editor, useEditor } from "./components/Editor";
export type {
  EditorProps,
  EditorToolbarProps,
  EditorContentProps,
  EditorAction,
  EditorContextValue,
} from "./components/Editor";

export { ContentRenderer, registerExtension, registerExtensions } from "./components/ContentRenderer";
export type {
  ContentRendererProps,
  RenderExtension,
  RenderExtensionProps,
} from "./components/ContentRenderer";

export { Menu, useMenu } from "./components/Menu";
export type {
  MenuProps,
  MenuItemProps,
  MenuSubmenuProps,
  MenuGroupProps,
  MenuOrientation,
  MenuContextValue,
} from "./components/Menu";

export { Sidebar, useSidebar } from "./components/Sidebar";
export type {
  SidebarProps,
  SidebarItemProps,
  SidebarGroupProps,
  SidebarSubmenuProps,
  SidebarToggleProps,
  SidebarCollapseMode,
  SidebarContextValue,
} from "./components/Sidebar";

export { MobileMenu, useMobileMenu } from "./components/MobileMenu";
export type {
  MobileMenuFlyoutProps,
  MobileMenuBottomBarProps,
  MobileMenuItemProps,
  MobileMenuVariant,
  MobileMenuSide,
  MobileMenuContextValue,
} from "./components/MobileMenu";

export { Kanban, useKanban } from "./components/Kanban";
export type {
  KanbanProps,
  KanbanColumnProps,
  KanbanCardProps,
  KanbanContextValue,
} from "./components/Kanban";

// Phase 7: Spatial Components
export { Canvas, useCanvas } from "./components/Canvas";
export type {
  CanvasProps,
  CanvasNodeProps,
  CanvasEdgeProps,
  CanvasMinimapProps,
  CanvasControlsProps,
  CanvasContextValue,
  ViewportState,
  EdgeAnchor,
} from "./components/Canvas";

export { Diagram, useDiagram } from "./components/Diagram";
export type {
  DiagramProps,
  DiagramEntityProps,
  DiagramFieldProps,
  DiagramRelationProps,
  DiagramToolbarProps,
  DiagramSchema,
  DiagramEntityData,
  DiagramFieldData,
  DiagramRelationData,
  DiagramType,
  RelationType,
  ExportFormat,
  DiagramContextValue,
} from "./components/Diagram";

// Utilities
export { cn } from "./utils/cn";
export type { Size, Color, Variant, ActionColor, Placement } from "./utils/types";

// Hooks
export {
  useControllableState,
  useOutsideClick,
  useEscapeKey,
  useFocusTrap,
  useFloatingPosition,
  useAnimation,
  useId,
  usePanZoom,
  useNodeRegistry,
} from "./hooks";
export type { NodeRect } from "./hooks";

// Data
export { EMOJI_DATA, EMOJI_ENTRIES, resolve, search, find } from "./data";
