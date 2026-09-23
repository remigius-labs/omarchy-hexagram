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
  readonly property string glyph: reading ? reading.hexagram.glyph : "䷀"
  readonly property string title: reading
    ? reading.hexagram.number + " · " + reading.hexagram.name
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

        // ---------- Name · number/pinyin ----------
        Column {
          width: parent.width
          spacing: Style.space(2)

          Text {
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            text: root.reading ? root.reading.hexagram.name : "Casting…"
            color: root.bar.foreground
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.title
            font.bold: true
          }
          Text {
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            text: root.reading
              ? (root.reading.hexagram.number + " · " + root.reading.hexagram.pinyin).toUpperCase()
              : ""
            color: Qt.darker(root.bar.foreground, 1.4)
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.2
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
              readonly property bool yang: root.reading.lines[modelData]
              width: parent.width
              height: Style.space(10)

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
            }
          }
        }

        // ---------- What it means ----------
        Text {
          width: parent.width
          horizontalAlignment: Text.AlignHCenter
          text: root.reading ? root.reading.hexagram.meaning : ""
          color: root.bar.foreground
          opacity: 0.85
          font.family: root.bar.fontFamily
          font.pixelSize: Style.font.bodySmall
          wrapMode: Text.WordWrap
          lineHeight: 1.25
        }

        PanelSeparator { foreground: root.bar.foreground }

        // ---------- Seed receipt ----------
        Column {
          width: parent.width
          spacing: Style.space(4)

          PanelSectionHeader {
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            text: "SEED · " + (root.reading ? root.reading.date : "")
            foreground: root.bar.foreground
            fontFamily: root.bar.fontFamily
          }
          Text {
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            text: root.reading ? root.reading.seed : ""
            color: root.bar.foreground
            opacity: 0.6
            font.family: root.bar.fontFamily
            font.pixelSize: Style.font.caption
            wrapMode: Text.WrapAnywhere
          }
          Text {
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
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
