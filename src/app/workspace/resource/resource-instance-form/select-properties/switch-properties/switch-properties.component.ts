import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Constants, ReadResource, ResourcePropertyDefinition } from '@dasch-swiss/dsp-js';
import { BaseValueComponent } from 'src/app/base-value.component';

@Component({
  selector: 'app-switch-properties',
  templateUrl: './switch-properties.component.html',
  styleUrls: ['./switch-properties.component.scss']
})
export class SwitchPropertiesComponent implements OnInit {

    @ViewChild('createVal') createValueComponent: BaseValueComponent;

    @Input() property: ResourcePropertyDefinition;

    @Input() parentResource: ReadResource;

    @Input() parentForm: FormGroup;

    @Input() formName: string;

    @Input() isRequiredProp: boolean;

    mode = 'create';
    constants = Constants;

    constructor() { }

    ngOnInit(): void {
        // the input isRequiredProp provided by KeyValuePair is stored as a number
        // a conversion from a number to a boolean is required by the input valueRequiredValidator
        this.isRequiredProp = !!+this.isRequiredProp;
    }

    saveNewValue() {
        const createVal = this.createValueComponent.getNewValue();
    }

}
