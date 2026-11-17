import { expectTypeOf, test } from 'vitest'
import { formatDatePartsForDisplay, formatDateForDisplay, formatTimestampForDateDisplay, formatDateValueForDisplay } from './dateDisplay'

test('R-01 requires an explicit locale on every display formatter', () => {
  expectTypeOf<Parameters<typeof formatDatePartsForDisplay>['length']>().toEqualTypeOf<3>()
  expectTypeOf<Parameters<typeof formatDateForDisplay>['length']>().toEqualTypeOf<3>()
  expectTypeOf<Parameters<typeof formatTimestampForDateDisplay>['length']>().toEqualTypeOf<3>()
  expectTypeOf<Parameters<typeof formatDateValueForDisplay>['length']>().toEqualTypeOf<3>()
})
