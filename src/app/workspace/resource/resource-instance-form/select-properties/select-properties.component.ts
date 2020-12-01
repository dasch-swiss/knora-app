import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CardinalityUtil, ReadResource, ResourceClassAndPropertyDefinitions, ResourceClassDefinition, ResourcePropertyDefinition } from '@dasch-swiss/dsp-js';
import { ValueService } from '@dasch-swiss/dsp-ui';
import { SwitchPropertiesComponent } from './switch-properties/switch-properties.component';

export interface Properties {
    [index: string]: ResourcePropertyDefinition;
}

@Component({
  selector: 'app-select-properties',
  templateUrl: './select-properties.component.html',
  styleUrls: ['./select-properties.component.scss']
})
export class SelectPropertiesComponent implements OnInit {

    @ViewChildren('switchProp') switchPropertiesComponent: QueryList<SwitchPropertiesComponent>;

    @Input() propertiesAsArray: Array<ResourcePropertyDefinition>;

    @Input() ontologyInfo: ResourceClassAndPropertyDefinitions;

    @Input() resourceClass: ResourceClassDefinition;

    @Input() parentForm: FormGroup;

    parentResource = new ReadResource();

    index = 0;

    propertyValuesKeyValuePair = {}; // { [index: string]: [number] }

    addButtonIsVisible: boolean;

    constructor(private _valueService: ValueService) { }

    ngOnInit() {
        if (this.propertiesAsArray) {
            for (const prop of this.propertiesAsArray) {
                if (prop) {
                    if (prop.objectType === 'http://api.knora.org/ontology/knora-api/v2#TextValue') {
                        prop.objectType = this._valueService.getTextValueClass(prop);
                    }

                    // each property will have at least one value so add one by default
                    this.propertyValuesKeyValuePair[prop.id] = [0];

                    // each property will also have a filtered array to be used when deleting a value.
                    // see the deleteValue method below for more info
                    this.propertyValuesKeyValuePair[prop.id + '-filtered'] = [0];
                }
            }
        }

        this.parentResource.entityInfo = this.ontologyInfo;
    }

    /**
     * Given a resource property, check if an add button should be displayed under the property values
     *
     * @param prop the resource property
     */
    addValueIsAllowed(prop: ResourcePropertyDefinition): boolean {
        return CardinalityUtil.createValueForPropertyAllowed(
            prop.id,
            this.propertyValuesKeyValuePair[prop.id].length,
            this.ontologyInfo.classes[this.resourceClass.id]
        );
    }

    /**
     * Called from the template when the user clicks on the add button
     */
    addNewValueFormToProperty(prop: ResourcePropertyDefinition) {
        // get the length of the corresponding property values array
        const length = this.propertyValuesKeyValuePair[prop.id].length;

        // add a new element to the corresponding property values array.
        // conveniently, we can use the length of the array to add the next number in the sequence
        this.propertyValuesKeyValuePair[prop.id].push(length);

        // add a new element to the corresponding filtered property values array as well.
        // if this array contains more than one element, the delete button with be shown
        this.propertyValuesKeyValuePair[prop.id + '-filtered'].push(length);
    }

    deleteValue(prop: ResourcePropertyDefinition, index: number) {
        // don't actually remove the item from the property values array, just set it to undefined.
        // this is because if we actually modify the indexes of the array, the template will re-evaluate
        // and recreate components for any elements after the deleted index, effectively erasing entered data if any was entered
        this.propertyValuesKeyValuePair[prop.id][index] = undefined;

        // update the filtered version of the corresponding property values array.
        // used in the template to calculate if the delete button should be shown.
        // e.i don't show the delete button if there is only one value
        this.propertyValuesKeyValuePair[prop.id + '-filtered'] = this.filterValueArray(this.propertyValuesKeyValuePair[prop.id]);
    }

    /**
     * Given an array of numbers, returns a filtered list with no undefined elements
     *
     * @param arrayToFilter an array of number containing undefined elements you wish to filter
     */
    private filterValueArray(arrayToFilter: number[]): number[] {
        arrayToFilter = arrayToFilter.filter( element => {
            return element !== undefined;
        });

        return arrayToFilter;

    }

