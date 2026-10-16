import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function ParticipantCategoryField() {
  return (
    <fieldset className={fields.group}>
      <legend className={fields.legend}>{it.joinCategoryLegend}</legend>
      <label className={fields.radio}>
        <input type="radio" name="category" value="PLAYER" required />
        <span className={fields.choiceCopy}>
          <strong>{it.categoryPlayer}</strong>
          <span className={fields.help}>{it.joinCategoryPlayerHelp}</span>
        </span>
      </label>
      <label className={fields.radio}>
        <input type="radio" name="category" value="STAFF" required />
        <span className={fields.choiceCopy}>
          <strong>{it.categoryStaff}</strong>
          <span className={fields.help}>{it.joinCategoryStaffHelp}</span>
        </span>
      </label>
    </fieldset>
  );
}
