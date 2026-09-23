import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

// Daily Hexagram: one I Ching glyph in the bar, cast once a day from your
// machine's own randomness. No click needed; the popup is just the receipt.
Panel {
  id: root
  moduleName: "remi.hexagram"
  ipcTarget: "remi.hexagram"

  property var reading: null
  readonly property string glyph: reading ? reading.primary.glyph : "䷀"
  readonly property string title: reading
    ? reading.primary.number + " · " + reading.primary.name
    : "Casting…"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function refresh() { if (!castProc.running) castProc.running = true }

  function applyCast(raw) {
    var next = Model.cast(raw)
    if (next) reading = next
  }

  Component.onCompleted: refresh()

  Process {
    id: castProc
    command: ["bash", "-c", Model.castScript]
    stdout: StdioCollector { waitForEnd: true; onStreamFinished: root.applyCast(text) }
  }

  // Cheap: the script only rerolls when the cached date is stale, so this is
  // a midnight watcher, not a re-cast.
  Timer { interval: 60000; running: true; repeat: true; onTriggered: root.refresh() }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.glyph
    tooltipText: root.title
    onPressed: function(b) { root.toggle() }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(300))
    contentHeight: panel.fittedContentHeight(column.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Column {
        id: column
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: Style.space(12)

        // ---------- Hero: glyph · number/name · pinyin ----------
        Row {
          width: parent.width
          spacing: Style.space(14)

          Text {
            text: root.glyph
            color: root.bar.foreground
            font.pixelSize: Style.font.displayLarge * 1.4
            anchors.verticalCenter: parent.verticalCenter
          }

          Column {
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(2)

            Text {
              text: root.reading ? root.reading.primary.name : "Casting…"
              color: root.bar.foreground
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.title
              font.bold: true
            }
            Text {
              text: root.reading
                ? (root.reading.primary.number + " · " + root.reading.primary.pinyin + " · "
                   + root.reading.primary.upper + " over " + root.reading.primary.lower).toUpperCase()
                : ""
              color: Qt.darker(root.bar.foreground, 1.4)
              font.family: root.bar.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1.2
            }
          }
        }

        // ---------- Lines, top to bottom, drawn full width ----------
        Column {
          width: parent.width
          spacing: Style.space(6)
          Repeater {
            model: root.reading ? [5, 4, 3, 2, 1, 0] : []
            Item {
              id: lineRow
              required property int modelData
              readonly property int value: root.reading.lines[modelData]
              readonly property bool yang: value === 7 || value === 9
              readonly property bool changing: value === 6 || value === 9
              width: parent.width
              height: Style.space(10)
              opacity: changing ? 1 : 0.55

              // Yang: one bar. Yin: two bars with a gap of one sixth.
              Rectangle {
                anchors.left: parent.left
                anchors.verticalCenter: parent.verticalCenter
                height: parent.height
                width: lineRow.yang ? parent.width : parent.width * 5 / 12
                radius: height / 3
                color: root.bar.foreground
              }
              Rectangle {
                visible: !lineRow.yang
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                height: parent.height
                width: parent.width * 5 / 12
                radius: height / 3
                color: root.bar.foreground
              }
              // Changing marker, the classic circle in the middle of the line.
              Rectangle {
                visible: lineRow.changing
                anchors.centerIn: parent
                width: parent.height * 1.6
                height: width
                radius: width / 2
                color: Color.popups.background
                border.width: 2
                border.color: root.bar.foreground
              }
            }
          }
        }

        // ---------- Becomes ----------
        Row {
          visible: !!(root.reading && root.reading.future)
          width: parent.width
          spacing: Style.space(10)

          Text {
            text: "becomes"
            color: root.bar.foreground
            opacity: 0.6
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.bodySmall
            anchors.verticalCenter: parent.verticalCenter
          }
          Text {
            text: root.reading && root.reading.future ? root.reading.future.glyph : ""
            color: root.bar.foreground
            font.pixelSize: Style.font.title
            anchors.verticalCenter: parent.verticalCenter
          }
          Text {
            text: root.reading && root.reading.future
              ? root.reading.future.number + " · " + root.reading.future.name : ""
            color: root.bar.foreground
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.bodySmall
            anchors.verticalCenter: parent.verticalCenter
          }
        }

        PanelSeparator { foreground: root.bar.foreground }

        // ---------- Seed receipt ----------
        Column {
          width: parent.width
          spacing: Style.space(4)

          PanelSectionHeader {
            text: "SEED · " + (root.reading ? root.reading.date : "")
            foreground: root.bar.foreground
            fontFamily: root.bar.fontFamily
          }
          Text {
            width: parent.width
            text: root.reading ? root.reading.seed : ""
            color: root.bar.foreground
            opacity: 0.6
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.caption
            wrapMode: Text.WrapAnywhere
          }
          Text {
            width: parent.width
            text: "od -An -tx1 -N32 /dev/urandom"
            color: root.bar.foreground
            opacity: 0.35
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.caption
          }
        }
      }
    }
  }
}
