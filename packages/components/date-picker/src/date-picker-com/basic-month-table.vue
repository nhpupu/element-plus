<template>
  <table
    role="grid"
    :aria-label="t('el.datepicker.monthTablePrompt')"
    :class="ns.b()"
    @click="handleMonthTableClick"
    @mousemove="handleMouseMove"
  >
    <tbody ref="tbodyRef">
      <tr v-for="(row, key) in rows" :key="key">
        <td
          v-for="(cell, key_) in row"
          :key="key_"
          :ref="(el) => isSelectedCell(cell) && (currentCellRef = el)"
          :class="getCellStyle(cell)"
          :aria-selected="`${isSelectedCell(cell)}`"
          :aria-label="t(`el.datepicker.month${+cell.text + 1}`)"
          :tabindex="isSelectedCell(cell) ? 0 : -1"
          @keydown.space.prevent.stop="handleMonthTableClick"
          @keydown.enter.prevent.stop="handleMonthTableClick"
        >
          <div>
            <span class="cell">
              {{ t('el.datepicker.months.' + months[cell.text]) }}
            </span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useLocale, useNamespace } from '@element-plus/hooks'
import { rangeArr } from '@element-plus/components/time-picker'
import { castArray, hasClass } from '@element-plus/utils'
import { basicMonthTableProps } from '../props/basic-month-table'

const datesInMonth = (year: number, month: number, lang: string) => {
  const firstDay = dayjs().locale(lang).startOf('month').month(month).year(year)
  const numOfDays = firstDay.daysInMonth()
  return rangeArr(numOfDays).map((n) => firstDay.add(n, 'day').toDate())
}

export default defineComponent({
  props: basicMonthTableProps,

  emits: ['changerange', 'pick', 'select'],
  expose: ['focus'],

  setup(props, ctx) {
    const ns = useNamespace('month-table')

    const { t, lang } = useLocale()
    const tbodyRef = ref<HTMLElement>()
    const currentCellRef = ref<HTMLElement>()
    const months = ref(
      props.date
        .locale('en')
        .localeData()
        .monthsShort()
        .map((_) => _.toLowerCase())
    )
    const tableRows = ref([[], [], []])
    const lastRow = ref(null)
    const lastColumn = ref(null)
    const rows = computed(() => {
      // TODO: refactory rows / getCellClasses
      const rows = tableRows.value
      const now = dayjs().locale(lang.value).startOf('month')

      for (let i = 0; i < 3; i++) {
        const row = rows[i]
        for (let j = 0; j < 4; j++) {
          let cell = row[j]
          if (!cell) {
            cell = {
              row: i,
              column: j,
              type: 'normal',
              inRange: false,
              start: false,
              end: false,
            }
          }

          cell.type = 'normal'

          const index = i * 4 + j
          const calTime = props.date.startOf('year').month(index)

          const calEndDate =
            props.rangeState.endDate ||
            props.maxDate ||
            (props.rangeState.selecting && props.minDate)

          cell.inRange =
            (props.minDate &&
              calTime.isSameOrAfter(props.minDate, 'month') &&
              calEndDate &&
              calTime.isSameOrBefore(calEndDate, 'month')) ||
            (props.minDate &&
              calTime.isSameOrBefore(props.minDate, 'month') &&
              calEndDate &&
              calTime.isSameOrAfter(calEndDate, 'month'))

          if (props.minDate?.isSameOrAfter(calEndDate)) {
            cell.start = calEndDate && calTime.isSame(calEndDate, 'month')
            cell.end = props.minDate && calTime.isSame(props.minDate, 'month')
          } else {
            cell.start = props.minDate && calTime.isSame(props.minDate, 'month')
            cell.end = calEndDate && calTime.isSame(calEndDate, 'month')
          }

          const isToday = now.isSame(calTime)
          if (isToday) {
            cell.type = 'today'
          }

          cell.text = index
          const cellDate = calTime.toDate()
          cell.disabled = props.disabledDate && props.disabledDate(cellDate)
          row[j] = cell
        }
      }
      return rows
    })

    watch(
      () => props.date,
      async () => {
        if (tbodyRef.value?.contains(document.activeElement)) {
          await nextTick()
          currentCellRef.value?.focus()
        }
      }
    )

    const focus = () => {
      currentCellRef.value?.focus()
    }

    const getCellStyle = (cell) => {
      const style = {} as any
      const year = props.date.year()
      const today = new Date()
      const month = cell.text

      style.disabled = props.disabledDate
        ? datesInMonth(year, month, lang.value).every(props.disabledDate)
        : false
      style.current =
        castArray(props.parsedValue).findIndex(
          (date) => date.year() === year && date.month() === month
        ) >= 0
      style.today = today.getFullYear() === year && today.getMonth() === month

      if (cell.inRange) {
        style['in-range'] = true

        if (cell.start) {
          style['start-date'] = true
        }

        if (cell.end) {
          style['end-date'] = true
        }
      }
      return style
    }

    const isSelectedCell = (cell) => {
      const year = props.date.year()
      const month = cell.text
      return (
        castArray(props.date).findIndex(
          (date) => date.year() === year && date.month() === month
        ) >= 0
      )
    }

    const handleMouseMove = (event) => {
      if (!props.rangeState.selecting) return

      let target = event.target
      if (target.tagName === 'A') {
        target = target.parentNode.parentNode
      }
      if (target.tagName === 'DIV') {
        target = target.parentNode
      }
      if (target.tagName !== 'TD') return

      const row = target.parentNode.rowIndex
      const column = target.cellIndex
      // can not select disabled date
      if (rows.value[row][column].disabled) return

      // only update rangeState when mouse moves to a new cell
      // this avoids frequent Date object creation and improves performance
      if (row !== lastRow.value || column !== lastColumn.value) {
        lastRow.value = row
        lastColumn.value = column
        ctx.emit('changerange', {
          selecting: true,
          endDate: props.date.startOf('year').month(row * 4 + column),
        })
      }
    }
    const handleMonthTableClick = (event) => {
      let target = event.target
      target = target?.closest('td')
      if (target?.tagName !== 'TD') return
      if (hasClass(target, 'disabled')) return
      const column = target.cellIndex
      const row = target.parentNode.rowIndex
      const month = row * 4 + column
      const newDate = props.date.startOf('year').month(month)
      if (props.selectionMode === 'range') {
        if (!props.rangeState.selecting) {
          ctx.emit('pick', { minDate: newDate, maxDate: null })
          ctx.emit('select', true)
        } else {
          if (newDate >= props.minDate) {
            ctx.emit('pick', { minDate: props.minDate, maxDate: newDate })
          } else {
            ctx.emit('pick', { minDate: newDate, maxDate: props.minDate })
          }
          ctx.emit('select', false)
        }
      } else {
        ctx.emit('pick', month)
      }
    }

    return {
      ns,
      tbodyRef,
      currentCellRef,
      handleMouseMove,
      handleMonthTableClick,
      focus,
      isSelectedCell,
      rows,
      getCellStyle,
      t,
      months,
    }
  },
})
</script>
