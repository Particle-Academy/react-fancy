import { vi } from "vitest";
import { createRef, type ReactElement } from "react";
import {
  Accordion,
  AccordionPanel,
  Autocomplete,
  ChatDrawer,
  CodeView,
  Breadcrumbs,
  Button,
  Calendar,
  Callout,
  Carousel,
  ChatThread,
  Checkbox,
  CheckboxGroup,
  CodeBlock,
  ColorPicker,
  Command,
  Composer,
  ContentReaction,
  ContextMenu,
  DatePicker,
  Drawer,
  Dropdown,
  Editor,
  EmojiSelect,
  FauxClient,
  FileBrowser,
  FileUpload,
  FullScreen,
  HotkeyCapture,
  ImagePill,
  ImageViewer,
  IndexList,
  Input,
  JsonEditor,
  Kanban,
  MagicWand,
  Menu,
  MobileMenu,
  Modal,
  MultiSwitch,
  Navbar,
  NumberField,
  OtpInput,
  Pagination,
  PdfViewer,
  PhoneInput,
  Pillbox,
  Popover,
  PromptInput,
  QrCodePanel,
  RadioGroup,
  ReasonTag,
  ReorderableGrid,
  ResizablePanels,
  Select,
  SetupWizard,
  Sidebar,
  SkipLink,
  Slider,
  Stepper,
  StreamingAudio,
  Switch,
  Table,
  Tabs,
  Textarea,
  TimeGrid,
  TimePicker,
  TreeNav,
} from "../src";
import { ToastItem } from "../src/components/Toast/ToastItem";
import type { ToastData } from "../src/components/Toast/Toast.types";

/**
 * Every react-fancy component that renders a control a person can tap, as the
 * touch-density suite renders it. Enumerated from `src/components` by grepping
 * for the elements and roles that take a tap (`<button`, `<a`, `<input`,
 * `<select`, `<textarea`, `role="tab|menuitem|option|…"`, `tabIndex={0}`), not
 * from memory: a component missing here is a component nobody measured.
 *
 * `open` runs after mount, for the popups whose items exist only once open.
 */
export type DensityFixture = {
  name: string;
  render: () => ReactElement;
  open?: (host: HTMLElement) => void;
  /**
   * A KNOWN gap: the suite asserts this fixture is still undersized, so the
   * day it is fixed the test fails and the note has to come out. Never a way
   * to make a red go green quietly.
   */
  gap?: string;
};

const noop = () => {};
const click = (sel: string) => (host: HTMLElement) => {
  const el = (host.querySelector(sel) ?? document.querySelector(sel)) as HTMLElement | null;
  if (!el) throw new Error(`open: nothing matches ${sel}`);
  el.click();
};

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export const FIXTURES: DensityFixture[] = [
  // ─── Actions ──────────────────────────────────────────────────────────────
  ...SIZES.map((size) => ({
    name: `Button size=${size}`,
    render: () => <Button size={size}>Save</Button>,
  })),
  ...SIZES.map((size) => ({
    name: `Button icon-only size=${size}`,
    render: () => <Button size={size} icon="x" aria-label="Close" />,
  })),
  { name: "Button as link", render: () => <Button href="#x">Docs</Button> },
  { name: "SkipLink", render: () => <SkipLink /> },

  // ─── Inputs ───────────────────────────────────────────────────────────────
  ...SIZES.map((size) => ({ name: `Input size=${size}`, render: () => <Input size={size} label="Email" /> })),
  { name: "Input with reveal", render: () => <Input type="password" label="Password" /> },
  ...SIZES.map((size) => ({
    name: `Select size=${size}`,
    render: () => <Select size={size} label="Country" list={["USA", "Canada"]} />,
  })),
  { name: "Textarea", render: () => <Textarea label="Bio" /> },
  ...SIZES.map((size) => ({ name: `Checkbox size=${size}`, render: () => <Checkbox size={size} label="Agree" /> })),
  {
    name: "CheckboxGroup",
    render: () => <CheckboxGroup label="Pick" list={["A", "B"]} value={[]} onValueChange={noop} />,
  },
  { name: "RadioGroup", render: () => <RadioGroup label="Plan" list={["Free", "Pro"]} onValueChange={noop} /> },
  ...(["sm", "md", "lg"] as const).map((size) => ({
    name: `Switch size=${size}`,
    render: () => <Switch size={size} label="Notify" />,
  })),
  { name: "MultiSwitch", render: () => <MultiSwitch list={["Daily", "Weekly"]} defaultValue="Daily" /> },
  { name: "NumberField", render: () => <NumberField label="Qty" value={1} onValueChange={noop} /> },
  { name: "Slider", render: () => <Slider label="Volume" defaultValue={50} showValue /> },
  { name: "DatePicker", render: () => <DatePicker label="Start" /> },
  { name: "TimePicker", render: () => <TimePicker /> },
  { name: "ColorPicker", render: () => <ColorPicker /> },
  { name: "OtpInput", render: () => <OtpInput length={4} /> },
  { name: "PhoneInput", render: () => <PhoneInput label="Mobile" value={null} onValueChange={noop} defaultCountry="US" /> },
  { name: "Pillbox", render: () => <Pillbox placeholder="Add" /> },
  {
    name: "Autocomplete",
    render: () => <Autocomplete options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} />,
    open: (host) => {
      const input = host.querySelector("input")!;
      input.focus();
      input.dispatchEvent(new Event("focus", { bubbles: true }));
    },
  },
  {
    name: "FileUpload",
    render: () => (
      <FileUpload>
        <FileUpload.Dropzone />
        <FileUpload.List />
      </FileUpload>
    ),
  },
  { name: "HotkeyCapture", render: () => <HotkeyCapture label="Palette" value="ctrl+k" onChange={noop} /> },
  { name: "EmojiSelect", render: () => <EmojiSelect onChange={noop} /> },
  {
    name: "EmojiSelect open",
    render: () => <EmojiSelect onChange={noop} />,
    open: click("[data-react-fancy-emoji-select] button"),
  },
  {
    name: "Select listbox open",
    render: () => <Select variant="listbox" searchable label="Country" list={["USA", "Canada"]} />,
    open: click("[data-react-fancy-select]"),
  },
  {
    name: "Select multiple open",
    render: () => <Select multiple label="Tags" list={["A", "B"]} value={[]} onValueChange={noop} />,
    open: click("[data-react-fancy-select]"),
  },
  {
    name: "PhoneInput country list open",
    render: () => <PhoneInput label="Mobile" value={null} onValueChange={noop} defaultCountry="US" />,
    open: click("[data-react-fancy-phone-input-country]"),
  },
  { name: "CodeView", render: () => <CodeView value="<p>x</p>" onChange={noop} language="html" /> },

  // ─── Navigation ───────────────────────────────────────────────────────────
  {
    name: "Tabs",
    render: () => (
      <Tabs defaultTab="a">
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panels>
          <Tabs.Panel value="a">one</Tabs.Panel>
          <Tabs.Panel value="b">two</Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    ),
  },
  { name: "Pagination", render: () => <Pagination page={3} totalPages={10} onPageChange={noop} /> },
  {
    name: "Breadcrumbs shrink",
    render: () => (
      <Breadcrumbs shrink>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item onClick={noop}>B</Breadcrumbs.Item>
        <Breadcrumbs.Item active>Here</Breadcrumbs.Item>
      </Breadcrumbs>
    ),
  },
  {
    name: "Sidebar submenu",
    render: () => (
      <Sidebar>
        <Sidebar.Submenu label="Reports" defaultOpen>
          <Sidebar.Item href="/r">Revenue</Sidebar.Item>
        </Sidebar.Submenu>
      </Sidebar>
    ),
  },
  {
    name: "MobileMenu bottom bar",
    render: () => (
      <MobileMenu.BottomBar>
        <MobileMenu.Item href="/" active>
          Home
        </MobileMenu.Item>
        <MobileMenu.Item href="/s">Search</MobileMenu.Item>
      </MobileMenu.BottomBar>
    ),
  },
  {
    name: "AccordionPanel",
    render: () => (
      <AccordionPanel orientation="horizontal" defaultValue={["w"]}>
        <AccordionPanel.Section id="h" pinned>
          <Button icon="home" aria-label="Home" />
        </AccordionPanel.Section>
        <AccordionPanel.Section id="w">
          <AccordionPanel.Trigger />
          <AccordionPanel.Content>
            <Button icon="list">Wishlist</Button>
          </AccordionPanel.Content>
        </AccordionPanel.Section>
      </AccordionPanel>
    ),
  },
  {
    name: "ChatDrawer",
    gap:
      "ChatDrawer renders no data-react-fancy-* handle at all, so no selector can reach its tabs or toggle " +
      "without matching consumer markup. Needs a root handle, which changes its default markup.",
    render: () => (
      <ChatDrawer
        tabs={[
          { id: "files", label: "Files" },
          { id: "tools", label: "Tools" },
        ]}
        activeTabId="tools"
        onTabChange={noop}
        open
        onToggle={noop}
      >
        <p>drawer</p>
      </ChatDrawer>
    ),
  },
  {
    name: "Breadcrumbs",
    render: () => (
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item active>Widget</Breadcrumbs.Item>
      </Breadcrumbs>
    ),
  },
  {
    name: "Navbar",
    render: () => (
      <Navbar>
        <Navbar.Items>
          <Navbar.Item href="/" active>
            Home
          </Navbar.Item>
        </Navbar.Items>
        <Navbar.Toggle />
      </Navbar>
    ),
  },
  {
    name: "Sidebar",
    render: () => (
      <Sidebar>
        <Sidebar.Item href="/" active>
          Home
        </Sidebar.Item>
        <Sidebar.Group label="Projects">
          <Sidebar.Item href="/a">A</Sidebar.Item>
        </Sidebar.Group>
        <Sidebar.Toggle />
      </Sidebar>
    ),
  },
  {
    name: "Menu",
    render: () => (
      <Menu>
        <Menu.Item href="/">Home</Menu.Item>
        <Menu.Submenu label="Products">
          <Menu.Item href="/w">Widgets</Menu.Item>
        </Menu.Submenu>
      </Menu>
    ),
  },
  {
    name: "MobileMenu flyout",
    render: () => (
      <MobileMenu.Flyout open onClose={noop}>
        <MobileMenu.Item>Home</MobileMenu.Item>
      </MobileMenu.Flyout>
    ),
  },
  {
    name: "Accordion",
    render: () => (
      <Accordion>
        <Accordion.Item value="a">
          <Accordion.Trigger>Question</Accordion.Trigger>
          <Accordion.Content>Answer</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    ),
  },
  {
    name: "Stepper",
    render: () => (
      <Stepper
        aria-label="Steps"
        clickable
        defaultCurrent={1}
        steps={[
          { id: "a", title: "One", content: <p>1</p> },
          { id: "b", title: "Two", content: <p>2</p> },
        ]}
      />
    ),
  },
  {
    name: "TreeNav",
    render: () => (
      <TreeNav
        nodes={[{ id: "src", label: "src", type: "folder", children: [{ id: "a", label: "a.ts", ext: "ts" }] }]}
        defaultExpandedIds={["src"]}
      />
    ),
  },
  {
    name: "Carousel",
    render: () => (
      <Carousel>
        <Carousel.Panels>
          <Carousel.Slide>1</Carousel.Slide>
          <Carousel.Slide>2</Carousel.Slide>
        </Carousel.Panels>
        <Carousel.Controls />
        <Carousel.Steps />
      </Carousel>
    ),
  },

  // ─── Overlays ─────────────────────────────────────────────────────────────
  {
    name: "Dropdown",
    render: () => (
      <Dropdown>
        <Dropdown.Trigger>
          <Button>Options</Button>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={noop}>Edit</Dropdown.Item>
          <Dropdown.Item danger onClick={noop}>
            Delete
          </Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>
    ),
    open: click("[data-react-fancy-action]"),
  },
  {
    name: "ContextMenu",
    render: () => (
      <ContextMenu>
        <ContextMenu.Trigger>
          <div data-ctx-target="">Right-click</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onClick={noop}>Cut</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    ),
    open: (host) => {
      host
        .querySelector("[data-ctx-target]")!
        .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 }));
    },
  },
  {
    name: "Popover",
    render: () => (
      <Popover>
        <Popover.Trigger>
          <Button>Open</Button>
        </Popover.Trigger>
        <Popover.Content>
          <p>Body</p>
        </Popover.Content>
      </Popover>
    ),
    open: click("[data-react-fancy-action]"),
  },
  {
    name: "Modal",
    render: () => (
      <Modal open onClose={noop}>
        <Modal.Header>Title</Modal.Header>
        <Modal.Body>Body</Modal.Body>
        <Modal.Footer>
          <Button>OK</Button>
        </Modal.Footer>
      </Modal>
    ),
  },
  {
    name: "Drawer",
    render: () => (
      <Drawer open onClose={noop}>
        <Drawer.Header>Title</Drawer.Header>
        <Drawer.Body>Body</Drawer.Body>
      </Drawer>
    ),
  },
  {
    name: "Command",
    render: () => (
      <Command open onClose={noop}>
        <Command.Input placeholder="Search" />
        <Command.List>
          <Command.Item value="one">one</Command.Item>
        </Command.List>
      </Command>
    ),
  },
  {
    name: "Toast item",
    render: () => (
      <ToastItem
        data={{ id: "t", title: "Saved", action: { label: "Undo", onClick: noop } } as ToastData}
        onDismiss={noop}
      />
    ),
  },
  { name: "Callout dismissible", render: () => <Callout dismissible>Note</Callout> },

  // ─── Rich content ─────────────────────────────────────────────────────────
  ...(["sm", "md", "lg"] as const).map((size) => ({
    name: `ContentReaction size=${size}`,
    render: () => <ContentReaction size={size} value={["like"]} onChange={noop} />,
    open: click("[data-react-fancy-content-reaction-trigger]"),
  })),
  { name: "PromptInput", render: () => <PromptInput budgetTokens={1000} platform="generic" onSubmit={noop} /> },
  { name: "Composer", render: () => <Composer onSubmit={noop} /> },
  {
    name: "Editor",
    render: () => (
      <Editor defaultValue="<p>Hi</p>">
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>
    ),
  },
  {
    name: "ChatThread",
    render: () => (
      <ChatThread
        messages={[{ id: "m", role: "assistant", content: "Hi", createdAt: "2026-11-12T10:00:00Z" }]}
        onLoadEarlier={noop}
      />
    ),
  },
  { name: "CodeBlock", render: () => <CodeBlock code="npm i" language="bash" /> },
  { name: "ImagePill", render: () => <ImagePill label="shot.png" src="data:image/png;base64,AA==" /> },
  {
    name: "ReasonTag",
    render: () => (
      <ReasonTag value="42" reason="because" sources={[{ label: "CRM export", href: "#crm" }]} onFollowUp={noop} />
    ),
    // A hover popover: hover the trigger, let its open delay elapse.
    open: (host) => {
      vi.useFakeTimers();
      host.querySelector(".cursor-help")!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(500);
      vi.useRealTimers();
    },
  },
  {
    name: "MagicWand",
    render: () => {
      const ref = createRef<HTMLTextAreaElement>();
      return (
        <div>
          <textarea ref={ref} defaultValue="hello world" aria-label="Body" data-fixture-host="" />
          <MagicWand target={ref} value="hello world" onValueChange={noop} actions={[{ id: "u", label: "Upper", run: (s) => s }]} />
        </div>
      );
    },
    // The wand appears over a selection.
    open: (host) => {
      const ta = host.querySelector("textarea")!;
      ta.setSelectionRange(6, 11);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    },
  },
  {
    name: "JsonEditor",
    render: () => <JsonEditor value={{ list: [1, 2], obj: { a: "x" } }} allowAdd allowRemove allowReorder />,
  },

  // ─── Data + canvas ────────────────────────────────────────────────────────
  {
    name: "Table",
    render: () => (
      <Table>
        <Table.Search placeholder="Filter" />
        <Table.Head>
          <Table.Row>
            <Table.Column label="Name" sortKey="name" />
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row tray={<p>details</p>}>
            <Table.Cell>Ada</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Pagination total={30} pageSize={10} />
      </Table>
    ),
  },
  { name: "Calendar", render: () => <Calendar onChange={noop} /> },
  {
    name: "TimeGrid",
    render: () => <TimeGrid rows={["Mon"]} cols={["9", "10"]} value={[[false, false]]} onChange={noop} toggleStripsOnHeaderClick />,
  },
  {
    name: "Kanban",
    render: () => (
      <Kanban>
        <Kanban.Column id="todo" title="To do">
          <Kanban.Card id="t1">Design</Kanban.Card>
        </Kanban.Column>
      </Kanban>
    ),
  },
  {
    name: "ReorderableGrid",
    render: () => (
      <ReorderableGrid
        items={[{ id: "a" }, { id: "b" }]}
        columns={2}
        renderItem={(item: { id: string }) => <span>{item.id}</span>}
        label="Fields"
      />
    ),
  },
  {
    name: "ResizablePanels",
    render: () => (
      <ResizablePanels value={30} onValueChange={noop} label="Resize">
        <nav>Side</nav>
        <main>Main</main>
      </ResizablePanels>
    ),
  },
  {
    name: "FileBrowser",
    render: () => (
      <FileBrowser
        snapshot={[{ path: "/src", name: "src", kind: "dir", children: [{ path: "/src/a.ts", name: "a.ts", kind: "file" }] }]}
        defaultPath="/src"
      />
    ),
  },
  { name: "IndexList", render: () => <IndexList items={[{ title: "One", href: "#1" }]} /> },
  {
    name: "SetupWizard",
    render: () => (
      <SetupWizard
        value={{ current: 0, done: [] }}
        onChange={noop}
        steps={[
          { id: "a", title: "Account", detail: "Sign up", url: "https://dashboard.example.com/signup", copy: [{ label: "Key", value: "x" }] },
          { id: "b", title: "Done", detail: "Finish" },
        ]}
      />
    ),
  },
  { name: "QrCodePanel", render: () => <QrCodePanel value="https://example.com" label="Link" /> },

  // ─── Media ────────────────────────────────────────────────────────────────
  {
    name: "ImageViewer",
    render: () => <ImageViewer src="data:image/png;base64,AA==" alt="x" controls />,
    // jsdom never loads an image; the controls appear once it has.
    open: (host) => host.querySelector("img")!.dispatchEvent(new Event("load")),
  },
  { name: "PdfViewer", render: () => <PdfViewer src="/x.pdf" title="x.pdf" /> },
  // VideoViewer / AudioViewer render the browser's own <video controls> /
  // <audio controls>: a user-agent control, which WCAG 2.5.5 exempts and
  // author CSS cannot size from inside.
  {
    name: "StreamingAudio",
    render: () => (
      <StreamingAudio
        stations={[{ id: "jazz", name: "Jazz FM", src: "https://ice.example.com/jazz" }]}
        value={{ stationId: "jazz", playing: false, volume: 1, muted: false }}
        onChange={noop}
      />
    ),
  },
  {
    name: "FullScreen",
    render: () => (
      <FullScreen>
        <FullScreen.Toggle />
        <p>chart</p>
      </FullScreen>
    ),
  },
  {
    name: "FauxClient",
    render: () => (
      <FauxClient variant="device" controls>
        x
      </FauxClient>
    ),
  },
];
